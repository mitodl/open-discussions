"""open_discussions constants"""
from rest_framework import status

PERMISSION_DENIED_ERROR_TYPE = "PermissionDenied"
NOT_AUTHENTICATED_ERROR_TYPE = "NotAuthenticated"
DJANGO_PERMISSION_ERROR_TYPES = (
    status.HTTP_401_UNAUTHORIZED,
    status.HTTP_403_FORBIDDEN,
)
