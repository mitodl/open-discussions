"""
Serializers for channel REST APIs
"""
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.constants import (
    VALID_CHANNEL_TYPES, 
    VALID_LINK_TYPES,
    ROLE_CONTRIBUTORS,
    ROLE_MODERATORS,
)
from channels.models import Channel, ChannelGroupRole, ChannelSubscription
from open_discussions.utils import filter_dict_with_renamed_keys
from open_discussions.serializers import WriteableSerializerMethodField


class ChannelAppearanceMixin(serializers.Serializer):
    """Serializer mixin for channel appearance"""

    avatar = WriteableSerializerMethodField()
    avatar_small = serializers.SerializerMethodField()
    avatar_medium = serializers.SerializerMethodField()
    banner = WriteableSerializerMethodField()

    def get_avatar(self, channel):
        """Get the avatar image URL"""
        return channel.avatar.url if channel.avatar else None

    def get_avatar_small(self, channel):
        """Get the avatar image small URL"""
        return channel.avatar_small.url if channel.avatar_small else None

    def get_avatar_medium(self, channel):
        """Get the avatar image medium URL"""
        return channel.avatar_medium.url if channel.avatar_medium else None

    def get_banner(self, channel):
        """Get the banner image URL"""
        return channel.banner.url if channel.banner else None

    def validate_avatar(self, value):
        """Empty validation function, but this is required for WriteableSerializerMethodField"""
        if not hasattr(value, "name"):
            raise ValidationError("Expected avatar to be a file")
        return {"avatar": value}

    def validate_banner(self, value):
        """Empty validation function, but this is required for WriteableSerializerMethodField"""
        if not hasattr(value, "name"):
            raise ValidationError("Expected banner to be a file")
        return {"banner": value}


class ChannelSerializer(ChannelAppearanceMixin, serializers.Serializer):
    """Serializer for channels"""

    title = serializers.CharField()
    name = serializers.CharField(source="display_name")
    description = serializers.CharField(required=False, allow_blank=True)
    public_description = serializers.CharField(
        required=False, allow_blank=True, max_length=80
    )
    channel_type = serializers.ChoiceField(
        source="subreddit_type", choices=VALID_CHANNEL_TYPES
    )
    link_type = serializers.ChoiceField(
        required=False,
        allow_blank=True,
        source="submission_type",
        choices=VALID_LINK_TYPES,
    )
    allowed_post_types = WriteableSerializerMethodField()
    user_is_contributor = serializers.SerializerMethodField()
    user_is_moderator = serializers.SerializerMethodField()
    user_is_subscriber = serializers.SerializerMethodField()
    widget_list_id = serializers.IntegerField(
        required=False, allow_null=True, read_only=True
    )
    membership_is_managed = serializers.BooleanField(required=False)
    ga_tracking_id = WriteableSerializerMethodField(allow_null=True)
    about = serializers.JSONField(allow_null=True, default=None)
    moderator_notifications = WriteableSerializerMethodField()

    def get_user_is_contributor(self, channel):
        """
        Get is_contributor from local DB
        """
        user = self.context.get("request").user
        if user.is_anonymous:
            return False
        return ChannelGroupRole.objects.filter(
            channel=channel._self_channel, 
            group__user=user, 
            role=ROLE_CONTRIBUTORS
        ).exists()

    def get_user_is_moderator(self, channel):
        """
        Get is_moderator from local DB
        """
        user = self.context.get("request").user
        if user.is_anonymous:
            return False
        return ChannelGroupRole.objects.filter(
            channel=channel._self_channel, 
            group__user=user, 
            role=ROLE_MODERATORS
        ).exists()

    def get_user_is_subscriber(self, channel):
        """
        Get user_is_subscriber from local DB
        """
        user = self.context.get("request").user
        if user.is_anonymous:
            return False
        return ChannelSubscription.objects.filter(
            channel=channel._self_channel, 
            user=user
        ).exists()

    def get_moderator_notifications(self, channel):
        """Get moderator notifications"""
        return (
            channel._self_channel.moderator_notifications  # pylint: disable=protected-access
        )

    def get_ga_tracking_id(self, channel):
        """Get google analytics tracking id"""
        return channel.ga_tracking_id

    def validate_moderator_notifications(self, value):
        """Empty validation function, but this is required for WriteableSerializerMethodField"""
        if not isinstance(value, bool):
            raise ValidationError("Expected moderator_notifications be a boolean")
        return {"moderator_notifications": value}

    def validate_ga_tracking_id(self, value):
        """Empty validation function, but this is required for WriteableSerializerMethodField"""
        if not (value is None or isinstance(value, str)):
            raise ValidationError("Expected ga_tracking_id to be a string")
        return {"ga_tracking_id": value}

    def get_allowed_post_types(self, channel):
        """Returns a dictionary of allowed post types"""
        from channels.api import get_allowed_post_types_from_link_type

        if channel.allowed_post_types:
            return [
                post_type
                for post_type, enabled in channel.allowed_post_types.items()
                if enabled
            ]

        return get_allowed_post_types_from_link_type(channel.submission_type)

    def validate_allowed_post_types(self, value):
        """Validate the allowed post types"""
        if not value:
            return {}

        if not isinstance(value, list) and not all(
            [isinstance(item, str) for item in value]
        ):
            raise ValidationError(
                "Expected allowed_post_types to be a list of enabled types"
            )

        allowed_keys = Channel.allowed_post_types.keys()

        for allowed_type in value:
            if allowed_type not in allowed_keys:
                raise ValidationError(
                    f"Post type {allowed_type} not supported for allowed_post_types"
                )

        return {"allowed_post_types": value}

    def _get_channel(self, name):
        """Get channel"""
        try:
            return self.context["channels"][name]
        except KeyError:
            # This can happen if the channel is newly created
            return Channel.objects.get(name=name)

    def create(self, validated_data):
        from channels.api import get_admin_api

        client = get_admin_api()
        # This is to reduce number of cassettes which need replacing
        validated_data["description"] = validated_data.get("description", "")
        validated_data["public_description"] = validated_data.get(
            "public_description", ""
        )

        # Set default value for managed to true since this is how micromasters will create channels.
        validated_data["membership_is_managed"] = validated_data.get(
            "membership_is_managed", True
        )

        lookup = {
            "display_name": "name",
            "title": "title",
            "subreddit_type": "channel_type",
            "description": "description",
            "public_description": "public_description",
            "submission_type": "link_type",
            "membership_is_managed": "membership_is_managed",
        }
        kwargs = filter_dict_with_renamed_keys(validated_data, lookup, optional=True)

        channel = client.create_channel(**kwargs)
        client.add_moderator(
            self.context["channel_api"].user.username, channel.display_name
        )
        return channel

    def update(self, instance, validated_data):
        api = self.context["channel_api"]
        name = instance.display_name
        lookup = {
            "title": "title",
            "subreddit_type": "channel_type",
            "submission_type": "link_type",
            "description": "description",
            "public_description": "public_description",
            "membership_is_managed": "membership_is_managed",
            "allowed_post_types": "allowed_post_types",
        }
        kwargs = filter_dict_with_renamed_keys(validated_data, lookup, optional=True)

        channel = api.update_channel(name=name, **kwargs)

        channel_obj = channel._self_channel  # pylint: disable=protected-access

        if "moderator_notifications" in validated_data:
            channel_obj.moderator_notifications = validated_data.get(
                "moderator_notifications"
            )
            channel_obj.save()

        if "ga_tracking_id" in validated_data:
            channel_obj.ga_tracking_id = validated_data.get("ga_tracking_id")
            channel_obj.save()

        avatar = validated_data.get("avatar")
        if avatar:
            channel_obj.avatar.save(f"channel_avatar_{name}.jpg", avatar, save=False)
            channel_obj.save(update_fields=["avatar"], update_image=True)

        banner = validated_data.get("banner")
        if banner:
            channel_obj.banner.save(f"channel_banner_{name}.jpg", banner, save=False)
            channel_obj.save(update_fields=["banner"], update_image=True)

        if "about" in validated_data:
            about = validated_data.get("about")
            channel_obj.about = about
            channel_obj.save()

        return channel
