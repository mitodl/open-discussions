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
    default_detail = 'Resource conflict.'
    default_code = 'resource_conflict'
