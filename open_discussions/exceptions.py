"""Exceptions for open discussions"""
from raven.contrib.django.raven_compat.models import client
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """
    Handles API exceptions by appending extra info
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if isinstance(exc, ValidationError):
        # validation errors should get sent to Sentry
        client.captureException()

    # now add the error type to the response
    # sometimes this is a list() if such an api was called
    if response is not None and isinstance(response.data, dict):
        response.data["error_type"] = exc.__class__.__name__

    return response


class DoNotUseRequestException(Exception):
    """This exception is raised during unit tests if an HTTP request is attempted"""
