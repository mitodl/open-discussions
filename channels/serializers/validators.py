"""Serializer utils"""
from django.contrib.auth import get_user_model

from rest_framework.serializers import ValidationError


User = get_user_model()


def validate_username(value):
    """
    Helper function to validate the username
    """
    if not isinstance(value, str):
        raise ValidationError("username must be a string")
    if not User.objects.filter(username=value).exists():
        raise ValidationError("username is not a valid user")
    return value


def validate_email(value):
    """
    Helper function to validate email
    """
    if not isinstance(value, str):
        raise ValidationError("email must be a string")
    if not User.objects.filter(email__iexact=value).exists():
        raise ValidationError("email does not exist")
    return value
