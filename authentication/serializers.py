"""Authentication serializers"""
import logging

from django.http import HttpResponseRedirect
from social_django.views import _do_login as login
from social_core.exceptions import InvalidEmail, AuthException
from social_core.utils import (
    user_is_authenticated,
    user_is_active,
    partial_pipeline_data,
)
from rest_framework import serializers

from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordException,
    RequirePasswordAndProfileException,
    RequireRegistrationException,
)
from authentication.utils import SocialAuthState

log = logging.getLogger()


class SocialAuthSerializer(serializers.Serializer):
    """Serializer for social auth"""
    partial_token = serializers.CharField(source='partial.token', default=None)
    flow = serializers.ChoiceField(choices=(
        (SocialAuthState.FLOW_LOGIN, "Login"),
        (SocialAuthState.FLOW_REGISTER, "Reigster"),
    ))
    state = serializers.CharField(read_only=True)
    errors = serializers.ListField(read_only=True)

    def _authenticate(self, is_login=None):
        """Authenticate the current request"""
        request = self.context['request']
        strategy = self.context['strategy']
        backend = self.context['backend']
        user = request.user

        is_authenticated = user_is_authenticated(user)
        user = user if is_authenticated else None

        kwargs = {
            'request': request,
        }

        if is_login is not None:
            kwargs['is_login'] = is_login

        partial = partial_pipeline_data(backend, user, **kwargs)
        if partial:
            user = backend.continue_pipeline(partial)
            # clean partial data after usage
            strategy.clean_partial_pipeline(partial.token)
        else:
            user = backend.complete(user=user, **kwargs)

        # check if the output value is something else than a user and just
        # return it to the client
        user_model = strategy.storage.user.user_model()
        if user and not isinstance(user, user_model):
            # this is where a redirect from the pipeline would get returned
            return user

        if is_authenticated:
            return SocialAuthState(SocialAuthState.STATE_SUCCESS)
        elif user:
            if user_is_active(user):
                social_user = user.social_user

                login(backend, user, social_user)
                # store last login backend name in session
                strategy.session_set('social_auth_last_login_backend', social_user.provider)

                return SocialAuthState(SocialAuthState.STATE_SUCCESS)
            else:
                return SocialAuthState(SocialAuthState.STATE_INACTIVE)
        else:  # pragma: no cover
            # this follows similar code in PSA itself, but wasn't reachable through normal testing
            return SocialAuthState(SocialAuthState.STATE_ERROR)

    def save(self, **kwargs):
        try:
            result = super().save(**kwargs)
        except InvalidEmail:
            result = SocialAuthState(SocialAuthState.STATE_INVALID_EMAIL)
        except AuthException as exc:
            log.exception("Received unexpected AuthException")
            result = SocialAuthState(SocialAuthState.STATE_ERROR, errors=[str(exc)])

        if isinstance(result, SocialAuthState) and result.partial is not None:
            strategy = self.context['strategy']
            strategy.storage.partial.store(result.partial)

        if not isinstance(result, SocialAuthState):
            # if we got here, we saw an unexpected result
            log.error("Received unexpected result: %s", result)
            result = SocialAuthState(SocialAuthState.STATE_ERROR)

        # return the passed flow back to the caller
        # this way they know if they're on a particular page because of an attempted registration or login
        result.flow = self.validated_data['flow']

        # update self.instance so we serializer the reight object
        self.instance = result

        return result


class LoginEmailSerializer(SocialAuthSerializer):
    """Serializer for email login"""
    partial_token = serializers.CharField(source='partial.token', read_only=True, default=None)
    email = serializers.EmailField(write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        try:
            result = super()._authenticate(is_login=True)
        except RequireRegistrationException as exc:
            # tried to login to a nonexistent account, so needs to register
            result = SocialAuthState(SocialAuthState.STATE_REGISTER_EMAIL, partial=exc.partial)
        except RequirePasswordException as exc:
            result = SocialAuthState(SocialAuthState.STATE_LOGIN_PASSWORD, partial=exc.partial)

        return result


class LoginPasswordSerializer(SocialAuthSerializer):
    """Serializer for email login with password"""
    password = serializers.CharField(min_length=8, write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        try:
            result = super()._authenticate(is_login=True)
        except InvalidPasswordException as exc:
            result = SocialAuthState(
                SocialAuthState.STATE_ERROR,
                partial=exc.partial,
                errors=[str(exc)],
            )
        return result


class RegisterEmailSerializer(SocialAuthSerializer):
    """Serializer for email register"""
    partial_token = serializers.CharField(source='partial.token', required=False, default=None)
    email = serializers.EmailField(write_only=True, required=False)

    def validate(self, attrs):
        token = (attrs.get('partial', {}) or {}).get('token', None)
        email = attrs.get('email', None)
        if not email and not token:
            raise serializers.ValidationError("One of 'partial' or 'email' is required")

        if email and token:
            raise serializers.ValidationError("Pass only one of 'partial' or 'email'")

        return attrs

    def create(self, validated_data):
        """Try to 'save' the request"""
        try:
            result = super()._authenticate(is_login=False)
            if isinstance(result, HttpResponseRedirect):
                # a redirect here means confirmation email sent
                result = SocialAuthState(SocialAuthState.STATE_REGISTER_CONFIRM_SENT)
        except RequirePasswordException as exc:
            result = SocialAuthState(
                SocialAuthState.STATE_LOGIN_PASSWORD,
                partial=exc.partial,
                errors=[str(exc)],
            )
        return result


class RegisterConfirmSerializer(SocialAuthSerializer):
    """Serializer for email confirmation"""
    partial_token = serializers.CharField(source='partial.token', read_only=True, default=None)
    verification_code = serializers.CharField(write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        try:
            result = super()._authenticate(is_login=False)
        except RequirePasswordAndProfileException as exc:
            result = SocialAuthState(
                SocialAuthState.STATE_REGISTER_DETAILS,
                partial=exc.partial,
                errors=[str(exc)],
            )
        return result


class RegisterDetailsSerializer(SocialAuthSerializer):
    """Serializer for registration details"""
    password = serializers.CharField(min_length=8, write_only=True)
    name = serializers.CharField(write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        return super()._authenticate(is_login=False)
