"""Serializers for field_channels"""
from rest_framework import serializers

from course_catalog.serializers import UserListSerializer
from field_channels.models import FieldChannel, Subfield, SubfieldList, FieldSubfield


class SubFieldListSerializer(serializers.ModelSerializer):
    """Serializer for SubFieldList"""

    list = UserListSerializer(read_only=True, many=False, allow_null=True)

    class Meta:
        model = SubfieldList
        fields = "__all__"


class SubFieldSerializer(serializers.ModelSerializer):

    lists = SubFieldListSerializer(read_only=True, many=True, allow_null=True)

    class Meta:
        model = Subfield
        fields = "__all__"


class FieldSubfieldSerializer(serializers.ModelSerializer):
    """Serializer for FieldSubfield"""
    subfield = SubFieldSerializer(read_only=True, many=False, allow_null=True)

    class Meta:
        model = FieldSubfield
        fields = "__all__"


class FieldChannelSerializer(serializers.ModelSerializer):
    """Serializer for FieldChannel"""
    subfields = FieldSubfieldSerializer(read_only=True, many=True, allow_null=True)

    class Meta:
        model = FieldChannel
        fields = "__all__"


