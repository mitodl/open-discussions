"""Authentication serializers"""
import logging

from django.contrib.auth import get_user_model
from django.http import HttpResponseRedirect
from social_django.views import _do_login as login
from social_core.backends.email import EmailAuth
from social_core.exceptions import InvalidEmail, AuthException
from social_core.utils import (
    user_is_authenticated,
    user_is_active,
    partial_pipeline_data,
    sanitize_redirect,
)
from rest_framework import serializers

from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordException,
    RequirePasswordAndProfileException,
    RequireProviderException,
    RequireRegistrationException,
)
from authentication.utils import SocialAuthState
from profiles.models import Profile
from profiles.serializers import ProfileSerializer
from open_discussions.utils import filter_dict_keys

log = logging.getLogger()

User = get_user_model()


class SocialAuthSerializer(serializers.Serializer):
    """Serializer for social auth"""
    partial_token = serializers.CharField(source='partial.token', default=None)
    flow = serializers.ChoiceField(choices=(
        (SocialAuthState.FLOW_LOGIN, "Login"),
        (SocialAuthState.FLOW_REGISTER, "Register"),
    ))
    provider = serializers.CharField(read_only=True)
    state = serializers.CharField(read_only=True)
    errors = serializers.ListField(read_only=True)
    redirect_url = serializers.CharField(read_only=True, default=None)

    def _save_next(self, data):
        """Persists the next url to the session"""
        if 'next' in data:
            backend = self.context['backend']
            # Check and sanitize a user-defined GET/POST next field value
            redirect_uri = data['next']
            if backend.setting('SANITIZE_REDIRECTS', True):
                allowed_hosts = backend.setting('ALLOWED_REDIRECT_HOSTS', []) + \
                                [backend.strategy.request_host()]
                redirect_uri = sanitize_redirect(allowed_hosts, redirect_uri)
            backend.strategy.session_set(
                'next',
                redirect_uri or backend.setting('LOGIN_REDIRECT_URL')
            )

    def _authenticate(self, flow):
        """Authenticate the current request"""
        request = self.context['request']
        strategy = self.context['strategy']
        backend = self.context['backend']
        user = request.user

        is_authenticated = user_is_authenticated(user)
        user = user if is_authenticated else None

        kwargs = {
            'request': request,
            'flow': flow,
        }

        partial = partial_pipeline_data(backend, user, **kwargs)
        if partial:
            user = backend.continue_pipeline(partial)
            # clean partial data after usage
            strategy.clean_partial_pipeline(partial.token)
        else:
            user = backend.complete(user=user, **kwargs)

        # pop redirect value before the session is trashed on login(), but after
        # the pipeline so that the pipeline can change the redirect if needed
        redirect_url = backend.strategy.session_get('next', None)

        # check if the output value is something else than a user and just
        # return it to the client
        user_model = strategy.storage.user.user_model()
        if user and not isinstance(user, user_model):
            # this is where a redirect from the pipeline would get returned
            return user

        if is_authenticated:
            return SocialAuthState(SocialAuthState.STATE_SUCCESS, redirect_url=redirect_url)
        elif user:
            if user_is_active(user):
                social_user = user.social_user

                login(backend, user, social_user)
                # store last login backend name in session
                strategy.session_set('social_auth_last_login_backend', social_user.provider)

                return SocialAuthState(SocialAuthState.STATE_SUCCESS, redirect_url=redirect_url)
            else:
                return SocialAuthState(SocialAuthState.STATE_INACTIVE)
        else:  # pragma: no cover
            # this follows similar code in PSA itself, but wasn't reachable through normal testing
            log.error("Unexpected authentication result")
            return SocialAuthState(SocialAuthState.STATE_ERROR, errors=[
                "Unexpected authentication result"
            ])

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

        if result.provider is None:
            result.provider = EmailAuth.name

        # update self.instance so we serializer the reight object
        self.instance = result

        return result


class LoginEmailSerializer(SocialAuthSerializer):
    """Serializer for email login"""
    partial_token = serializers.CharField(source='partial.token', read_only=True, default=None)
    email = serializers.EmailField(write_only=True)
    extra_data = serializers.JSONField(read_only=True)
    next = serializers.CharField(write_only=True, required=False)

    def create(self, validated_data):
        """Try to 'save' the request"""
        profile_to_serialize = None

        self._save_next(validated_data)

        try:
            result = super()._authenticate(SocialAuthState.FLOW_LOGIN)
        except RequireProviderException as exc:
            result = SocialAuthState(SocialAuthState.STATE_LOGIN_PROVIDER, provider=exc.social_auth.provider)
            profile_to_serialize = exc.social_auth.user.profile
        except RequireRegistrationException:
            result = SocialAuthState(SocialAuthState.STATE_ERROR, errors=[
                "Couldn't find your MIT OPEN Account"
            ])
        except RequirePasswordException as exc:
            result = SocialAuthState(SocialAuthState.STATE_LOGIN_PASSWORD, partial=exc.partial)
            profile_to_serialize = Profile.objects.filter(
                user__social_auth__uid=validated_data.get('email'),
                user__social_auth__provider=EmailAuth.name
            ).first()
        if profile_to_serialize:
            profile_data = ProfileSerializer(profile_to_serialize).data
            result.extra_data = filter_dict_keys(
                profile_data, [
                    'profile_image_small',
                    'name'
                ]
            )
        return result


class LoginPasswordSerializer(SocialAuthSerializer):
    """Serializer for email login with password"""
    password = serializers.CharField(min_length=8, write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        try:
            result = super()._authenticate(SocialAuthState.FLOW_LOGIN)
        except InvalidPasswordException as exc:
            result = SocialAuthState(
                SocialAuthState.STATE_ERROR,
                partial=exc.partial,
                errors=[str(exc)],
            )
        return result


class RegisterEmailSerializer(SocialAuthSerializer):
    """Serializer for email register"""
    email = serializers.EmailField(write_only=True, required=False)
    next = serializers.CharField(write_only=True, required=False)

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
        self._save_next(validated_data)

        try:
            result = super()._authenticate(SocialAuthState.FLOW_REGISTER)
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
    partial_token = serializers.CharField(source='partial.token')
    verification_code = serializers.CharField(write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        try:
            result = super()._authenticate(SocialAuthState.FLOW_REGISTER)
        except RequirePasswordAndProfileException as exc:
            result = SocialAuthState(
                SocialAuthState.STATE_REGISTER_DETAILS,
                partial=exc.partial,
            )
        return result


class RegisterDetailsSerializer(SocialAuthSerializer):
    """Serializer for registration details"""
    password = serializers.CharField(min_length=8, write_only=True)
    name = serializers.CharField(write_only=True)

    def create(self, validated_data):
        """Try to 'save' the request"""
        return super()._authenticate(SocialAuthState.FLOW_REGISTER)
