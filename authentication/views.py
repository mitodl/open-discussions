"""Authentication views"""
from django.conf import settings
from django.core import mail as django_mail
from django.contrib.auth import get_user_model
from django.shortcuts import render, redirect
from social_core.backends.email import EmailAuth
from social_django.utils import load_backend
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_jwt.settings import api_settings
from anymail.message import AnymailMessage
from djoser.views import (
    PasswordResetView as DjoserPasswordResetView,
    PasswordResetConfirmView as DjoserPasswordResetConfirmView
)
from djoser.email import PasswordResetEmail as DjoserPasswordResetEmail

from open_discussions import features
from authentication.serializers import (
    LoginEmailSerializer,
    LoginPasswordSerializer,
    RegisterEmailSerializer,
    RegisterConfirmSerializer,
    RegisterDetailsSerializer,
)
from authentication.utils import load_drf_strategy
from mail.api import render_email_templates, send_messages

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
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer_cls = self.get_serializer_cls()
        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = serializer_cls(data=request.data, context={
            'request': request,
            'strategy': strategy,
            'backend': backend,
        })

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


def login_complete(request, **kwargs):  # pylint: disable=unused-argument
    """View that completes the login"""
    # redirect to home
    response = redirect('/')

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
        context = super().get_context_data()
        context.update(self.context)
        with django_mail.get_connection(settings.NOTIFICATION_EMAIL_BACKEND) as connection:
            subject, text_body, html_body = render_email_templates('password_reset', context)
            msg = AnymailMessage(
                subject=subject,
                body=text_body,
                to=to,
                from_email=settings.MAILGUN_FROM_EMAIL,
                connection=connection,
            )
            msg.attach_alternative(html_body, "text/html")
            send_messages([msg])


class CustomPasswordResetView(DjoserPasswordResetView):
    """Custom view to modify base functionality in Djoser's PasswordResetView class"""
    def post(self, request):
        """
        Overrides djoser.views.PasswordResetView#post and adds two bits of logic:

        1. Returns 404 if the EMAIL_AUTH feature is not enabled
        2. In version 0.30.0, the fetch function in redux-hammock does not handle responses
        with empty response data. Djoser returns 204's with empty response data, so we are
        coercing that to a 200 with an empty dict as the response data. This can be removed
        when redux-hammock is changed to support 204's.
        """
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)
        response = super().post(request)
        if response.status_code == status.HTTP_204_NO_CONTENT:
            return Response({}, status=status.HTTP_200_OK)
        return response


class CustomPasswordResetConfirmView(DjoserPasswordResetConfirmView):
    """Custom view to modify base functionality in Djoser's PasswordResetConfirmView class"""
    def post(self, request):
        """
        Overrides djoser.views.PasswordResetView#post and adds two bits of logic:

        1. Returns 404 if the EMAIL_AUTH feature is not enabled
        2. In version 0.30.0, the fetch function in redux-hammock does not handle responses
        with empty response data. Djoser returns 204's with empty response data, so we are
        coercing that to a 200 with an empty dict as the response data. This can be removed
        when redux-hammock is changed to support 204's.
        """
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)
        response = super().post(request)
        if response.status_code == status.HTTP_204_NO_CONTENT:
            return Response({}, status=status.HTTP_200_OK)
        return response
