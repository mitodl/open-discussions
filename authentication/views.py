"""Authentication views"""
from django.conf import settings
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_jwt.settings import api_settings
from social_core.backends.email import EmailAuth
from social_django.utils import load_backend

from open_discussions import features

from authentication.serializers import (
    LoginEmailSerializer,
    LoginPasswordSerializer,
    RegisterEmailSerializer,
    RegisterConfirmSerializer,
    RegisterDetailsSerializer,
)
from authentication.utils import load_drf_strategy


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
