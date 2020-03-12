"""
Exceptions for the channels app
"""
from rest_framework import status
from rest_framework.exceptions import APIException


class RemoveUserException(Exception):
    """
    To be raised in case the provided user or username cannot be removed
    """


class ConflictException(APIException):
    """
    An action would cause a conflict with an existing resource
    """

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Resource conflict."
    default_code = "resource_conflict"


class GoneException(APIException):
    """
    Existing resource is gone
    """

    status_code = status.HTTP_410_GONE
    default_detail = "Resource is gone."
    default_code = "resource_gone"


class MoiraException(Exception):
    """Custom exception to be used when something goes wrong with Moira API calls"""
