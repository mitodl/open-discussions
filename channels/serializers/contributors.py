"""Serializers for contributor REST APIs"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from channels.serializers.validators import validate_email, validate_username
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.models import Profile

User = get_user_model()


class ContributorSerializer(serializers.Serializer):
    """Serializer for contributors. Should be accessible by moderators only"""

    contributor_name = WriteableSerializerMethodField()
    email = WriteableSerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def validate_contributor_name(self, value):
        """Validate contributor name"""
        return {"contributor_name": validate_username(value)}

    def get_contributor_name(self, instance):
        """Returns the name for the contributor"""
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

    def create(self, validated_data):
        api = self.context["channel_api"]
        channel_name = self.context["view"].kwargs["channel_name"]
        contributor_name = validated_data.get("contributor_name")
        email = validated_data.get("email")

        if email and contributor_name:
            raise ValueError("Only one of contributor_name, email should be specified")

        if contributor_name:
            username = contributor_name
        elif email:
            username = User.objects.get(email__iexact=email).username
        else:
            raise ValueError("Missing contributor_name or email")

        return api.add_contributor(username, channel_name)
