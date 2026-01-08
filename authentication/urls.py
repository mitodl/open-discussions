"""URL configurations for authentication"""
from django.conf import settings
from django.contrib.auth import views as auth_views
from django.urls import path, re_path
from django.views.generic import RedirectView

from authentication.views import (
    CustomDjoserAPIView,
    CustomLogoutView,
    LoginEmailView,
    LoginPasswordView,
    RegisterConfirmView,
    RegisterDetailsView,
    RegisterEmailView,
    get_social_auth_types,
    get_user_details_for_keycloak,
    login_complete,
)
from open_discussions.features import KEYCLOAK_ENABLED

urlpatterns = [
    re_path(r"^api/v0/auths/$", get_social_auth_types, name="get-auth-types-api"),
    re_path(r"^login/complete$", login_complete, name="login-complete"),
]
if settings.FEATURES.get(KEYCLOAK_ENABLED):
    urlpatterns += [
        path(
            "api/v0/auth/<email>",
            get_user_details_for_keycloak,
            name="get-user-details-for-keycloak",
        ),
        path(
            "settings/password",
            RedirectView.as_view(
                url=f"{settings.KEYCLOAK_BASE_URL}/realms/{settings.KEYCLOAK_REALM_NAME}/account/?referrer={settings.OPEN_DISCUSSIONS_TITLE}&referrer_uri={settings.SITE_BASE_URL}#/account-security/signing-in/"
            ),
            name="update-password-request-api",
        ),
        re_path(r"^logout/$", CustomLogoutView.as_view(), name="logout"),
    ]
else:
    urlpatterns += [
        re_path(r"^logout/$", auth_views.LogoutView.as_view(), name="logout"),
        re_path(
            r"^api/v0/login/email/$", LoginEmailView.as_view(), name="psa-login-email"
        ),
        re_path(
            r"^api/v0/login/password/$",
            LoginPasswordView.as_view(),
            name="psa-login-password",
        ),
        re_path(
            r"^api/v0/register/email/$",
            RegisterEmailView.as_view(),
            name="psa-register-email",
        ),
        re_path(
            r"^api/v0/register/confirm/$",
            RegisterConfirmView.as_view(),
            name="psa-register-confirm",
        ),
        re_path(
            r"^api/v0/register/details/$",
            RegisterDetailsView.as_view(),
            name="psa-register-details",
        ),
        re_path(
            r"^api/v0/password_reset/$",
            CustomDjoserAPIView.as_view({"post": "reset_password"}),
            name="password-reset-api",
        ),
        re_path(
            r"^api/v0/password_reset/confirm/$",
            CustomDjoserAPIView.as_view({"post": "reset_password_confirm"}),
            name="password-reset-confirm-api",
        ),
        re_path(
            r"^api/v0/set_password/$",
            CustomDjoserAPIView.as_view({"post": "set_password"}),
            name="set-password-api",
        ),
    ]
