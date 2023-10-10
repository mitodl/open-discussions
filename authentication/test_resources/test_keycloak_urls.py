"""URL configurations for authentication"""
from django.urls import path

from authentication.views import (
    get_user_details_for_keycloak,
    post_request_password_update,
)

urlpatterns = [
    path(
        "api/v0/auth/<email>",
        get_user_details_for_keycloak,
        name="get-user-details-for-keycloak",
    ),
    path(
        "api/v0/update_password_request/",
        post_request_password_update,
        name="update-password-request-api",
    ),
]
