"""
authentication views
"""
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


class LoginEmailView(APIView):
    """Email login view"""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """Processes a login"""
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)

        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = LoginEmailSerializer(data=request.data, context={
            'request': request,
            'strategy': strategy,
            'backend': backend,
        })

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginPasswordView(APIView):
    """Email login view"""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """Processes a login"""
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)

        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = LoginPasswordSerializer(data=request.data, context={
            'request': request,
            'strategy': strategy,
            'backend': backend,
        })
        if serializer.is_valid():
            serializer.save()

            print(request.user)
            print(request.session)

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class RegisterEmailView(APIView):
    """Email register view"""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """Processes a registration"""
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)

        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = RegisterEmailSerializer(data=request.data, context={
            'request': request,
            'strategy': strategy,
            'backend': backend,
        })

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterConfirmView(APIView):
    """Email registration confirmation view"""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """Processes a registration confirmation"""
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)

        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = RegisterConfirmSerializer(data=request.data, context={
            'request': request,
            'strategy': strategy,
            'backend': backend,
        })

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterDetailsView(APIView):
    """Email registration details view"""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """Processes a registration confirmation"""
        if not features.is_enabled(features.EMAIL_AUTH):
            return Response(status=status.HTTP_404_NOT_FOUND)

        strategy = load_drf_strategy(request)
        backend = load_backend(strategy, EmailAuth.name, None)
        serializer = RegisterDetailsSerializer(data=request.data, context={
            'request': request,
            'strategy': strategy,
            'backend': backend,
        })

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
