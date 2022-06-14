"""Serializers for channels_fields"""
from django.contrib.auth import get_user_model
from guardian.shortcuts import assign_perm
from rest_framework import serializers

from channels.constants import WIDGET_LIST_CHANGE_PERM
from channels.serializers.validators import validate_email, validate_username
from channels_fields.api import add_user_role, create_field_groups_and_roles
from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.models import FieldChannel
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.models import Profile
from widgets.models import WidgetList

User = get_user_model()


class FieldChannelSerializer(serializers.ModelSerializer):
    """Serializer for FieldChannel"""

    class Meta:
        model = FieldChannel
        fields = "__all__"
        read_only_fields = ("widget_list",)

    def create(self, validated_data):
        widget_list = WidgetList.objects.create()

        field_channel, _ = FieldChannel.objects.get_or_create(
            name=validated_data["name"],
            defaults={"widget_list": widget_list, **validated_data},
        )

        roles = create_field_groups_and_roles(field_channel)
        moderator_group = roles[FIELD_ROLE_MODERATORS].group
        assign_perm(WIDGET_LIST_CHANGE_PERM, moderator_group, widget_list)
        return field_channel


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
        add_user_role(
            FieldChannel.objects.get(name=field_name), FIELD_ROLE_MODERATORS, user
        )
        return user
