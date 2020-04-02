"""Discussions serializer"""
from django.db import transaction
from rest_framework import serializers

from discussions import api
from discussions.models import Channel
from open_discussions.utils import now_in_utc

DEFAULT_CHANNEL_READ_ONLY_FIELDS = (
    "id",
    "avatar_small",
    "avatar_medium",
    "created_on",
    "updated_on",
)


class ChannelSerializer(serializers.ModelSerializer):
    """Serializer for channels"""

    avatar_small = serializers.ImageField(read_only=True)
    avatar_medium = serializers.ImageField(read_only=True)

    def save(self, **kwargs):
        """Save the channel"""
        channel = super().save(**kwargs)

        api.channels.set_channel_permissions(channel)

        return channel

    class Meta:
        model = Channel
        fields = (
            "id",
            "name",
            "title",
            "membership_is_managed",
            "allowed_post_types",
            "channel_type",
            "banner",
            "about",
            "avatar",
            "avatar_small",
            "avatar_medium",
            "ga_tracking_id",
            "created_on",
            "updated_on",
        )
        extra_kwargs = {"updated_on": {"default": now_in_utc}}
        # channel name cannot be modified once created
        read_only_fields = DEFAULT_CHANNEL_READ_ONLY_FIELDS + ("name",)


class CreateChannelSerializer(ChannelSerializer):
    """Serializer for creating channels"""

    @transaction.atomic
    def create(self, validated_data):
        """Create a channel"""
        moderator_group, contributor_group = api.channels.create_channel_groups(
            validated_data["name"]
        )

        validated_data["moderator_group"] = moderator_group
        validated_data["contributor_group"] = contributor_group

        channel = super().create(validated_data)

        return channel

    class Meta(ChannelSerializer.Meta):
        read_only_fields = DEFAULT_CHANNEL_READ_ONLY_FIELDS
        extra_kwargs = {
            **ChannelSerializer.Meta.extra_kwargs,
            "created_on": {"default": now_in_utc},
        }
