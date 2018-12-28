"""Serializer utils"""
from rest_framework import serializers


def parse_bool(value, field_name):
    """Helper method to parse boolean values"""
    if value in serializers.BooleanField.TRUE_VALUES:
        return True
    if value in serializers.BooleanField.FALSE_VALUES:
        return False
    raise serializers.ValidationError("{} must be a bool".format(field_name))
