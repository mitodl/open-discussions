"""URL configurations for authentication"""
from django.conf import settings
from django.urls import path
from django.views.generic import RedirectView

from authentication.views import get_user_details_for_keycloak

urlpatterns = [
    path(
        "api/v0/auth/<email>",
        get_user_details_for_keycloak,
        name="get-user-details-for-keycloak",
    ),
    path(
        "update_password",
        RedirectView.as_view(
            url=f"{settings.KEYCLOAK_BASE_URL}/realms/{settings.KEYCLOAK_REALM_NAME}/account/?referrer={settings.OPEN_DISCUSSIONS_TITLE}&referrer_uri={settings.SITE_BASE_URL}#/account-security/signing-in/"
        ),
        name="update-password-request-api",
    ),
]
