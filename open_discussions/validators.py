"""DRF Validators"""
from rest_framework.serializers import ValidationError


def is_true(value):
    """The passed value must be True"""
    if value is not True:
        raise ValidationError('This field must be true')
