"""
authentication views
"""
from django.conf import settings
from django.http import Http404
from django.shortcuts import render, redirect
from rest_framework_jwt.settings import api_settings

from open_discussions import features
from authentication.forms import (
    LoginForm,
    EmailForm,
)


def login(request, **kwargs):  # pylint: disable=unused-argument
    """The login view"""
    if not features.is_enabled(features.EMAIL_AUTH):
        raise Http404("Page not found")

    if not request.user.is_anonymous:
        return redirect('/')

    return render(request, "login.html", context={
        "form": LoginForm(),
    })


def register(request, **kwargs):  # pylint: disable=unused-argument
    """The register view"""
    if not features.is_enabled(features.EMAIL_AUTH):
        raise Http404("Page not found")

    if not request.user.is_anonymous:
        return redirect('/')

    return render(request, "register.html", context={
        "form": EmailForm(),
    })


def jwt_login_complete(request, **kwargs):  # pylint: disable=unused-argument
    """View that complete the jwt-based login by clearing the cookie"""
    # redirect to what python-social-auth normally would have
    response = redirect(settings.SOCIAL_AUTH_LOGIN_REDIRECT_URL)
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
