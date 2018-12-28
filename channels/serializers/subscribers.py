"""
Serializers for channel REST APIs
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.models import ChannelSubscription
from open_discussions.serializers import WriteableSerializerMethodField

User = get_user_model()


class SubscriberSerializer(serializers.Serializer):
    """Serializer for subscriber"""

    subscriber_name = WriteableSerializerMethodField()

    def get_subscriber_name(self, instance):
        """Returns the name for the subscriber"""
        return instance.username

    def validate_subscriber_name(self, value):
        """Validates the subscriber name"""
        if not isinstance(value, str):
            raise ValidationError("subscriber name must be a string")
        if not User.objects.filter(username=value).exists():
            raise ValidationError("subscriber name is not a valid user")
        return {"subscriber_name": value}

    def create(self, validated_data):
        api = self.context["channel_api"]
        channel_name = self.context["view"].kwargs["channel_name"]
        username = validated_data["subscriber_name"]
        api.add_subscriber(username, channel_name)
        return ChannelSubscription.objects.get(
            channel__name=channel_name, user__username=username
        ).user
