"""
Serializers for channel REST APIs
"""
from datetime import (
    datetime,
    timezone,
)

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.api import (
    Api,
    VALID_CHANNEL_TYPES,
)


class ChannelSerializer(serializers.Serializer):
    """Serializer for channels"""

    title = serializers.CharField()
    name = serializers.CharField(source='display_name')
    public_description = serializers.CharField()
    channel_type = serializers.ChoiceField(
        source="subreddit_type",
        choices=VALID_CHANNEL_TYPES,
    )

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        return api.create_channel(
            name=validated_data['display_name'],
            title=validated_data['title'],
            channel_type=validated_data['subreddit_type'],
            public_description=validated_data['public_description'],
        )

    def update(self, instance, validated_data):
        api = Api(user=self.context['request'].user)
        name = instance.display_name
        kwargs = {}
        if 'title' in validated_data:
            kwargs['title'] = validated_data['title']
        if 'subreddit_type' in validated_data:
            kwargs['channel_type'] = validated_data['subreddit_type']
        if 'public_description' in validated_data:
            kwargs['public_description'] = validated_data['public_description']

        return api.update_channel(name=name, **kwargs)


class WriteableSerializerMethodField(serializers.SerializerMethodField):
    """
    A SerializerMethodField which has been marked as not read_only so that submitted data passed validation.
    The actual update is handled in PostSerializer.update(...).
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.read_only = False

    def to_internal_value(self, data):
        return data


class PostSerializer(serializers.Serializer):
    """Serializer for posts"""
    url = WriteableSerializerMethodField(allow_null=True)
    text = WriteableSerializerMethodField(allow_null=True)
    title = serializers.CharField()
    upvoted = WriteableSerializerMethodField()
    downvoted = WriteableSerializerMethodField()
    score = serializers.IntegerField(source='ups', read_only=True)
    author = serializers.CharField(read_only=True)
    id = serializers.CharField(read_only=True)
    created = serializers.SerializerMethodField()
    num_comments = serializers.IntegerField(read_only=True)
    channel_name = serializers.SerializerMethodField()

    def get_url(self, instance):
        """Returns a url or null depending on if it's a self post"""
        return instance.url if not instance.is_self else None

    def get_text(self, instance):
        """Returns text or null depending on if it's a self post"""
        return instance.selftext if instance.is_self else None

    def get_upvoted(self, instance):
        """Did the user upvote this?"""
        return instance.likes is True

    def get_downvoted(self, instance):
        """Did the user downvote this?"""
        return instance.likes is False

    def get_created(self, instance):
        """The ISO-8601 formatted datetime for the creation time"""
        return datetime.fromtimestamp(instance.created, tz=timezone.utc).isoformat()

    def get_channel_name(self, instance):
        """The channel which contains the post"""
        return instance.subreddit.display_name

    @staticmethod
    def _parse_bool(value, field_name):
        """Helper method to parse boolean values"""
        if value in serializers.BooleanField.TRUE_VALUES:
            return True
        if value in serializers.BooleanField.FALSE_VALUES:
            return False
        raise ValidationError("{} must be a bool".format(field_name))

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {'upvoted': self._parse_bool(value, 'upvoted')}

    def validate_downvoted(self, value):
        """Validate that downvoted is a bool"""
        return {'downvoted': self._parse_bool(value, 'downvoted')}

    def validate_text(self, value):
        """Validate that text is a string or null"""
        if value is not None and not isinstance(value, str):
            raise ValidationError("text must be a string")
        return {"text": value}

    def validate_url(self, value):
        """Validate that URL is a string or null"""
        if value is not None and not isinstance(value, str):
            raise ValidationError("url must be a string")
        return {"url": value}

    def validate(self, attrs):
        if attrs.get('downvoted') and attrs.get('upvoted'):
            raise ValidationError("Only one of upvoted or downvoted can be true")

        # url/text validation needs to go in created since it's handled differently
        # than for update
        return attrs

    def create(self, validated_data):
        title = validated_data['title']
        text = validated_data.get('text')
        url = validated_data.get('url')

        if text and url:
            raise ValidationError('Only one of text or url can be used to create a post')

        if not text and not url:
            raise ValidationError('One of text or url must be provided to create a post')

        kwargs = {}
        if text:
            kwargs['text'] = text
        else:
            kwargs['url'] = url

        api = Api(user=self.context['request'].user)
        channel_name = self.context['view'].kwargs['channel_name']
        post = api.create_post(
            channel_name,
            title=title,
            **kwargs
        )
        changed = self._apply_vote(post, validated_data)
        if not changed:
            return post
        else:
            return api.get_post(post_id=post.id)

    def update(self, instance, validated_data):
        post_id = self.context['view'].kwargs['post_id']

        if "url" in validated_data:
            raise ValidationError("Cannot edit url for a post")

        api = Api(user=self.context['request'].user)
        if "text" in validated_data:
            instance = api.update_post(post_id=post_id, text=validated_data['text'])

        self._apply_vote(instance, validated_data)
        return api.get_post(post_id=post_id)

    def _apply_vote(self, instance, validated_data):
        """
        Apply a vote provided by the user.

        Args:
            instance (Post): A post
            validated_data (dict): validated data which contains the new vote from the user

        Returns:
            bool:
                True if a change was made, False otherwise
        """
        downvote = validated_data.get('downvoted')
        upvote = validated_data.get('upvoted')

        is_downvoted = self.get_downvoted(instance)
        is_upvoted = self.get_upvoted(instance)

        if downvote and not is_downvoted:
            instance.downvote()
        elif upvote and not is_upvoted:
            instance.upvote()
        elif (downvote is False and is_downvoted) or (upvote is False and is_upvoted):
            instance.clear_vote()
        else:
            return False
        return True
