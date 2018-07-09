"""URL configurations for authentication"""
from django.conf.urls import url

from authentication.views import (
    LoginEmailView,
    LoginPasswordView,
    RegisterEmailView,
    RegisterConfirmView,
    RegisterDetailsView,
    login_complete,
    CustomPasswordResetView,
    CustomPasswordResetConfirmView,
)


urlpatterns = [
    url(r'^api/v0/login/email/$', LoginEmailView.as_view(), name='psa-login-email'),
    url(r'^api/v0/login/password/$', LoginPasswordView.as_view(), name='psa-login-password'),
    url(r'^api/v0/register/email/$', RegisterEmailView.as_view(), name='psa-register-email'),
    url(r'^api/v0/register/confirm/$', RegisterConfirmView.as_view(), name='psa-register-confirm'),
    url(r'^api/v0/register/details/$', RegisterDetailsView.as_view(), name='psa-register-details'),
    url(r'^api/v0/password_reset/$', CustomPasswordResetView.as_view(), name='password-reset-api'),
    url(
        r'^api/v0/password_reset/confirm/$',
        CustomPasswordResetConfirmView.as_view(),
        name='password-reset-confirm-api'
    ),
    url(r'^login/complete$', login_complete, name='login-complete'),
]
