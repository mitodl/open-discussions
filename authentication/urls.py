"""URL configurations for authentication"""
from django.conf import settings
from django.urls import re_path, path

from authentication.views import (
    LoginEmailView,
    LoginPasswordView,
    RegisterEmailView,
    RegisterConfirmView,
    RegisterDetailsView,
    get_social_auth_types,
    login_complete,
    CustomDjoserAPIView,
    get_user_details_for_keycloak,
    post_request_password_update,
    CustomLogoutView,
)
from django.contrib.auth import views as auth_views

urlpatterns = [
    re_path(r"^api/v0/auths/$", get_social_auth_types, name="get-auth-types-api"),
    re_path(r"^login/complete$", login_complete, name="login-complete"),
]
if "KEYCLOAK_ENABLED" in settings.FEATURES and settings.FEATURES["KEYCLOAK_ENABLED"]:
    urlpatterns += [
        path(
            "api/v0/auth/<email>",
            get_user_details_for_keycloak,
            name="get-user-details-for-keycloak",
        ),
        path(
            "api/v0/update_password_request/<user_id>",
            post_request_password_update,
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
