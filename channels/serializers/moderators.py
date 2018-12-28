"""Serializers for moderator REST APIs"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from channels.serializers.validators import validate_email, validate_username
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.models import Profile

User = get_user_model()


class ModeratorPublicSerializer(serializers.Serializer):
    """Serializer for moderators, viewable by end users"""

    moderator_name = serializers.SerializerMethodField()

    def get_moderator_name(self, instance):
        """Returns the name for the moderator"""
        return instance.name


class ModeratorPrivateSerializer(serializers.Serializer):
    """Serializer for moderators, viewable by other moderators"""

    moderator_name = WriteableSerializerMethodField()
    email = WriteableSerializerMethodField()
    full_name = serializers.SerializerMethodField()
    can_remove = serializers.SerializerMethodField()

    def validate_moderator_name(self, value):
        """Validate moderator name"""
        return {"moderator_name": validate_username(value)}

    def get_moderator_name(self, instance):
        """Returns the name for the moderator"""
        return instance.name

    def validate_email(self, value):
        """Validate email"""
        return {"email": validate_email(value)}

    def get_email(self, instance):
        """Get the email from the associated user"""
        return (
            User.objects.filter(username=instance.name)
            .values_list("email", flat=True)
            .first()
        )

    def get_full_name(self, instance):
        """Get the full name of the associated user"""
        return (
            Profile.objects.filter(user__username=instance.name)
            .values_list("name", flat=True)
            .first()
        )

    def get_can_remove(self, instance):
        """Figure out whether the logged in user can remove this moderator"""
        if self.context["mod_date"] is None:
            return False
        return int(instance.date) >= int(self.context["mod_date"])

    def create(self, validated_data):
        api = self.context["channel_api"]
        channel_name = self.context["view"].kwargs["channel_name"]

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

        api.add_moderator(username, channel_name)
        return api._list_moderators(  # pylint: disable=protected-access
            channel_name=channel_name, moderator_name=username
        )[0]
