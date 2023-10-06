"""Authentication views"""
import json
from urllib.parse import quote

import requests
from anymail.message import AnymailMessage
from django.conf import settings
from django.contrib.auth import get_user_model, update_session_auth_hash, views
from django.core import mail as django_mail
from django.http import Http404
from django.shortcuts import redirect, render
from authentication.backends.ol_open_id_connect import OlOpenIdConnectAuth
from djoser.email import PasswordResetEmail as DjoserPasswordResetEmail
from djoser.utils import ActionViewMixin
from djoser.views import UserViewSet
from rest_framework import status
from rest_framework.decorators import (
    action,
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_jwt.settings import api_settings
from social_core.backends.email import EmailAuth
from social_django.models import UserSocialAuth
from social_django.utils import load_backend, load_strategy

from authentication.serializers import (
    LoginEmailSerializer,
    LoginPasswordSerializer,
    RegisterConfirmSerializer,
    RegisterDetailsSerializer,
    RegisterEmailSerializer,
)
from authentication.utils import load_drf_strategy
from authentication.api import (
    logout_of_keycloak,
)
from mail.api import render_email_templates, send_messages
from open_discussions.authentication import BearerAuthentication
from open_discussions.permissions import IsStaffPermission

User = get_user_model()


class SocialAuthAPIView(APIView):
    """API view for social auth endpoints"""

    authentication_classes = []
    permission_classes = []

    def get_serializer_cls(self):  # pragma: no cover
        """Return the serializer cls"""
        raise NotImplementedError("get_serializer_cls must be implemented")

    def post(self, request):
        """Processes a request"""
        if request._cached_user.is_hijacked:
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer_cls = self.get_serializer_cls()
        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = serializer_cls(
            data=request.data,
            context={"request": request, "strategy": strategy, "backend": backend},
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginEmailView(SocialAuthAPIView):
    """Email login view"""

    def get_serializer_cls(self):
        """Return the serializer cls"""
        return LoginEmailSerializer


class LoginPasswordView(SocialAuthAPIView):
    """Email login view"""

    def get_serializer_cls(self):
        """Return the serializer cls"""
        return LoginPasswordSerializer


class RegisterEmailView(SocialAuthAPIView):
    """Email register view"""

    def get_serializer_cls(self):
        """Return the serializer cls"""
        return RegisterEmailSerializer

    def post(self, request):
        """Verify recaptcha response before proceeding"""
        if request._cached_user.is_hijacked:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if settings.RECAPTCHA_SITE_KEY:
            r = requests.post(
                "https://www.google.com/recaptcha/api/siteverify?secret={key}&response={captcha}".format(
                    key=quote(settings.RECAPTCHA_SECRET_KEY),
                    captcha=quote(request.data["recaptcha"]),
                ),
                timeout=settings.REQUESTS_TIMEOUT,
            )
            response = r.json()
            if not response["success"]:
                return Response(response, status=status.HTTP_400_BAD_REQUEST)
        return super().post(request)


class RegisterConfirmView(SocialAuthAPIView):
    """Email registration confirmation view"""

    def get_serializer_cls(self):
        """Return the serializer cls"""
        return RegisterConfirmSerializer


class RegisterDetailsView(SocialAuthAPIView):
    """Email registration details view"""

    def get_serializer_cls(self):
        """Return the serializer cls"""
        return RegisterDetailsSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_social_auth_types(request):
    """
    View that returns a serialized list of the logged-in user's UserSocialAuth types
    """
    social_auths = (
        UserSocialAuth.objects.filter(user=request.user).values("provider").distinct()
    )
    return Response(data=social_auths, status=status.HTTP_200_OK)


def login_complete(request, **kwargs):  # pylint: disable=unused-argument
    """View that completes the login"""
    # redirect to home
    response = redirect("/")
    if request._cached_user.is_hijacked:
        return response
    if api_settings.JWT_AUTH_COOKIE in request.COOKIES:
        # to clear a cookie, it's most reliable to set it to expire immediately
        response.set_cookie(
            api_settings.JWT_AUTH_COOKIE,
            domain=settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN,
            httponly=True,
            max_age=0,
        )

    return response


def confirmation_sent(request, **kwargs):  # pylint: disable=unused-argument
    """The confirmation of an email being sent"""
    return render(request, "confirmation_sent.html")


class CustomPasswordResetEmail(DjoserPasswordResetEmail):
    """Custom class to modify base functionality in Djoser's PasswordResetEmail class"""

    def send(self, to, *args, **kwargs):
        """
        Overrides djoser.email.PasswordResetEmail#send to use our mail API.
        """
        context = self.get_context_data()
        context.update(self.context)
        with django_mail.get_connection(
            settings.NOTIFICATION_EMAIL_BACKEND
        ) as connection:
            subject, text_body, html_body = render_email_templates(
                "password_reset", context
            )
            msg = AnymailMessage(
                subject=subject,
                body=text_body,
                to=to,
                from_email=settings.MAILGUN_FROM_EMAIL,
                connection=connection,
            )
            msg.attach_alternative(html_body, "text/html")
            send_messages([msg])

    def get_context_data(self):
        """Adds base_url to the template context"""
        context = super().get_context_data()
        context["base_url"] = settings.SITE_BASE_URL
        return context


class CustomDjoserAPIView(UserViewSet, ActionViewMixin):
    """
    Overrides post methods of a Djoser view and adds one extra piece of logic:

    In version 0.30.0, the fetch function in redux-hammock does not handle responses
    with empty response data. Djoser returns 204's with empty response data, so we are
    coercing that to a 200 with an empty dict as the response data. This can be removed
    when redux-hammock is changed to support 204's.
    """

    def post(
        self, request, **kwargs
    ):  # pylint: disable=missing-docstring,arguments-differ
        response = super().post(request)
        if response.status_code == status.HTTP_204_NO_CONTENT:
            return Response({}, status=status.HTTP_200_OK)
        return response

    @action(["post"], detail=False)
    def reset_password(self, request, *args, **kwargs):
        response = super().reset_password(request, *args, **kwargs)
        # See class docstring for explanation
        if response.status_code == status.HTTP_204_NO_CONTENT:
            return Response({}, status=status.HTTP_200_OK)
        return response

    @action(["post"], detail=False)
    def reset_password_confirm(self, request, *args, **kwargs):
        response = super().reset_password_confirm(request, *args, **kwargs)
        # See class docstring for explanation
        if response.status_code == status.HTTP_204_NO_CONTENT:
            return Response({}, status=status.HTTP_200_OK)
        return response

    @action(["post"], detail=False)
    def set_password(self, request, *args, **kwargs):
        """
        Overrides CustomDjoserAPIView.post to update the session after a successful
        password change. Without this explicit refresh, the user's session would be
        invalid and they would be logged out.
        """
        response = super().set_password(request, *args, **kwargs)
        if response.status_code in (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT):
            update_session_auth_hash(self.request, self.request.user)
            return Response({}, status=status.HTTP_200_OK)
        return response


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsStaffPermission])
@authentication_classes([BearerAuthentication])
def get_user_details_for_keycloak(request, email):
    """
    Endpoint for the Keycloak plug-in: https://github.com/daniel-frak/keycloak-user-migration.

    Args:
        email (string): The email of a user record in Open Discussions.

    Returns:
        Response: GET requests will respond with the user's first and last name,
            and email address, along with some additional flags specific for
            Keycloak.
            POST requests will respond with a 200 status if the password,
            contained in the body, matches the user's record.  If the
            password does not match the user's record, a 403 response is
            provided.
            Both requests will respond with a 404 if no Open Discussion's user
            has an email matching the email argument.
    """
    user = User.objects.filter(email=email).first()
    if user:
        if request.method == "POST":
            body = json.loads(request.body)
            if "password" in body and user.check_password(body["password"]):
                return Response({}, status=status.HTTP_200_OK)
            else:
                return Response({}, status=status.HTTP_403_FORBIDDEN)
        else:
            response = {
                "email": user.email,
                "username": user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "enabled": True,
                "emailVerified": True,
                "attributes": {},
                "roles": ["default-roles-olapps"],
                "groups": [],
                "requiredActions": [],
            }
            return Response(response, status=status.HTTP_200_OK)
    else:
        raise Http404("User not found")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def post_request_password_update(request):
    """
    <COLLIN>

    Args:
        uid (string): The uid of a user record in Open Discussions.

    Returns:
        Response: <COLLIN>
    """
    user = getattr(request, "user", None)
    if user:
        strategy = load_strategy(request)
        storage = strategy.storage
        user_social_auth_record = (
            storage.user.get_social_auth_for_user(
                user, provider=OlOpenIdConnectAuth.name
            )
            .filter(user=user)
            .first()
        )
        if user_social_auth_record:
            payload = json.dumps(["UPDATE_PASSWORD"])
            client_id = "ol-open-discussions-local"
            realm_name = "olapps"
            keycloak_base_url = "https://sso-qa.odl.mit.edu"
            url = f"{keycloak_base_url}/admin/realms/{realm_name}/users/{user_social_auth_record.uid}/execute-actions-email?client_id={client_id}"
            access_token = user_social_auth_record.get_access_token(strategy)
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            response = requests.request("PUT", url, headers=headers, data=payload)
        return Response({response}, status=status.HTTP_200_OK)
    else:
        raise Http404("User not found")


class CustomLogoutView(views.LogoutView):
    """COLLIN"""

    def post(self, request):
        """COLLIN"""
        user = getattr(request, "user", None)
        if user:
            logout_of_keycloak(user)
            return super().post(request)
        else:
            raise Http404("User not found")

    def get(self, request):
        """COLLIN"""
        user = getattr(request, "user", None)
        if user:
            logout_of_keycloak(user)
            return super().get(request)
        else:
            raise Http404("User not found")
