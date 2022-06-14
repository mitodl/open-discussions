"""Serializers for field_channels"""
from django.contrib.auth.models import Group
from guardian.shortcuts import assign_perm
from rest_framework import serializers

from channels.constants import WIDGET_LIST_CHANGE_PERM
from channels.serializers.moderators import ModeratorPrivateSerializer
from course_catalog.serializers import UserListSerializer
from field_channels.api import create_field_groups_and_roles
from field_channels.constants import FIELD_ROLE_MODERATORS
from field_channels.models import FieldChannel, Subfield, SubfieldList, FieldSubfield, FieldChannelGroupRole
from field_channels.utils import get_group_role_name
from widgets.models import WidgetList


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

    def create(self, validated_data):
        widget_list = WidgetList.objects.create()

        field_channel, created = FieldChannel.objects.get_or_create(
            name=validated_data["name"],
            defaults={
                "widget_list": widget_list,
                **validated_data
            },
        )

        roles = create_field_groups_and_roles(field_channel)
        moderator_group = roles[FIELD_ROLE_MODERATORS].group
        assign_perm(WIDGET_LIST_CHANGE_PERM, moderator_group, widget_list)
        return field_channel

    def update(self, instance, validated_data):
        field_channel = super().update(instance, validated_data)
        return field_channel


"""Serializers for moderator REST APIs"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from channels.serializers.validators import validate_email, validate_username
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.models import Profile

User = get_user_model()


class FieldModeratorSerializer(serializers.Serializer):
    """Serializer for moderators"""
    moderator_name = WriteableSerializerMethodField()
    email = WriteableSerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def validate_moderator_name(self, value):
        """Validate moderator name"""
        return {"moderator_name": validate_username(value)}

    def get_moderator_name(self, instance):
        """Returns the name for the moderator"""
        return instance.username

    def validate_email(self, value):
        """Validate email"""
        return {"email": validate_email(value)}

    def get_email(self, instance):
        """Get the email from the associated user"""
        return (
            User.objects.filter(username=instance.username)
                .values_list("email", flat=True)
                .first()
        )

    def get_full_name(self, instance):
        """Get the full name of the associated user"""
        return (
            Profile.objects.filter(user__username=instance.username)
                .values_list("name", flat=True)
                .first()
        )

    def create(self, validated_data):
        field_name = self.context["view"].kwargs["field_name"]
        moderator_name = validated_data.get("moderator_name")
        email = validated_data.get("email")

        if email and moderator_name:
            raise ValueError("Only one of moderator_name, email should be specified")

        if moderator_name:
            username = moderator_name
        elif email:
            username = User.objects.get(email__iexact=email).username
        else:
            raise ValueError("Missing moderator_name or email")

        user = User.objects.get(username=username)
        user.groups.add((Group.objects.get(name=get_group_role_name(field_name, FIELD_ROLE_MODERATORS))))
        return user
