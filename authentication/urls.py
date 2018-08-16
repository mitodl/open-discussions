"""URL configurations for authentication"""
from django.conf.urls import url
from django.contrib.auth import views as auth_views

from authentication.views import (
    LoginEmailView,
    LoginPasswordView,
    RegisterEmailView,
    RegisterConfirmView,
    RegisterDetailsView,
    get_social_auth_types,
    login_complete,
    CustomPasswordResetView,
    CustomPasswordResetConfirmView,
    CustomSetPasswordView,
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
    url(r'^api/v0/set_password/$', CustomSetPasswordView.as_view(), name='set-password-api'),
    url(r'^api/v0/auths/$', get_social_auth_types, name='get-auth-types-api'),
    url(r'^login/complete$', login_complete, name='login-complete'),
    url(r'^logout/$', auth_views.LogoutView.as_view(), name='logout')
]
