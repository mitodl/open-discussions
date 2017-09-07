"""
Serializers for channel REST APIs
"""
from datetime import (
    datetime,
    timezone,
)

from django.contrib.auth import get_user_model
from praw.models.reddit.submission import Submission
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.api import (
    Api,
    VALID_CHANNEL_TYPES,
)

User = get_user_model()

User = get_user_model()


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


class ModeratorSerializer(serializers.Serializer):
    """Serializer for Moderators"""
    name = serializers.CharField()

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        channel_name = self.context['view'].kwargs['channel_name']
        moderator_name = self.context['view'].kwargs['moderator_name']

        return api.add_moderator(moderator_name, channel_name)


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


def _apply_vote(instance, validated_data, allow_downvote):
    """
    Apply a vote provided by the user to a comment or post, if it's different than before.

    Args:
        instance (Comment or Post): A comment or post
        validated_data (dict): validated data which contains the new vote from the user
        allow_downvote (bool): If false, ignore downvotes

    Returns:
        bool:
            True if a change was made, False otherwise
    """
    upvote = validated_data.get('upvoted')
    if allow_downvote:
        downvote = validated_data.get('downvoted')
    else:
        downvote = None

    is_upvoted = instance.likes is True
    is_downvoted = instance.likes is False

    if upvote and not is_upvoted:
        instance.upvote()
    elif downvote and not is_downvoted:
        instance.downvote()
    elif (upvote is False and is_upvoted) or (downvote is False and is_downvoted):
        instance.clear_vote()
    else:
        return False
    return True


def _parse_bool(value, field_name):
    """Helper method to parse boolean values"""
    if value in serializers.BooleanField.TRUE_VALUES:
        return True
    if value in serializers.BooleanField.FALSE_VALUES:
        return False
    raise ValidationError("{} must be a bool".format(field_name))


class PostSerializer(serializers.Serializer):
    """Serializer for posts"""
    url = WriteableSerializerMethodField(allow_null=True)
    text = WriteableSerializerMethodField(allow_null=True)
    title = serializers.CharField()
    upvoted = WriteableSerializerMethodField()
    score = serializers.IntegerField(source='ups', read_only=True)
    author_id = serializers.CharField(read_only=True, source='author')
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

    def get_created(self, instance):
        """The ISO-8601 formatted datetime for the creation time"""
        return datetime.fromtimestamp(instance.created, tz=timezone.utc).isoformat()

    def get_channel_name(self, instance):
        """The channel which contains the post"""
        return instance.subreddit.display_name

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {'upvoted': _parse_bool(value, 'upvoted')}

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
        changed = _apply_vote(post, validated_data, False)
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

        _apply_vote(instance, validated_data, False)
        return api.get_post(post_id=post_id)


class CommentSerializer(serializers.Serializer):
    """Serializer for comments"""
    id = serializers.CharField(read_only=True)
    post_id = serializers.SerializerMethodField()
    comment_id = serializers.CharField(write_only=True, allow_blank=True, required=False)
    text = serializers.CharField(source='body')
    author_id = serializers.CharField(read_only=True, source='author')
    score = serializers.IntegerField(read_only=True)
    upvoted = WriteableSerializerMethodField()
    downvoted = WriteableSerializerMethodField()
    created = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    def get_post_id(self, instance):
        """The post id for this comment"""
        try:
            # This is also available from instance.parent() but this avoids the recursive lookup
            # which isn't necessary since we only view this from the list view, which has the
            # post_id parameter.
            return self.context['view'].kwargs['post_id']
        except KeyError:
            # This happens if we don't have the post id in the URL, for example the comment detail view
            parent = instance.parent()
            while not isinstance(parent, Submission):
                parent = parent.parent()
            return parent.id

    def get_upvoted(self, instance):
        """Is a comment upvoted?"""
        return instance.likes is True

    def get_downvoted(self, instance):
        """Is a comment downvoted?"""
        return instance.likes is False

    def get_replies(self, instance):
        """List of replies to this comment"""
        return [CommentSerializer(reply, context=self.context).data for reply in instance.replies]

    def get_created(self, instance):
        """The ISO-8601 formatted datetime for the creation time"""
        return datetime.fromtimestamp(instance.created, tz=timezone.utc).isoformat()

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {'upvoted': _parse_bool(value, 'upvoted')}

    def validate_downvoted(self, value):
        """Validate that downvoted is a bool"""
        return {'downvoted': _parse_bool(value, 'downvoted')}

    def validate(self, attrs):
        """Validate that the the combination of fields makes sense"""
        if attrs.get('upvoted') and attrs.get('downvoted'):
            raise ValidationError("upvoted and downvoted cannot both be true")
        return attrs

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        post_id = self.context['view'].kwargs['post_id']

        kwargs = {}
        if validated_data.get('comment_id'):
            kwargs['comment_id'] = validated_data['comment_id']
        else:
            kwargs['post_id'] = post_id

        comment = api.create_comment(
            text=validated_data['body'],
            **kwargs
        )

        changed = _apply_vote(comment, validated_data, True)
        if changed:
            return api.get_comment(comment.id)
        else:
            return comment

    def update(self, instance, validated_data):
        if validated_data.get('comment_id'):
            raise ValidationError("comment_id must be provided via URL")
        api = Api(user=self.context['request'].user)
        if 'body' in validated_data:
            api.update_comment(comment_id=instance.id, text=validated_data['body'])

        _apply_vote(instance, validated_data, True)

        return api.get_comment(comment_id=instance.id)


class ContributorSerializer(serializers.Serializer):
    """Serializer for contributors"""
    contributor_name = WriteableSerializerMethodField()

    def get_contributor_name(self, instance):
        """Returns the name for the contributor"""
        return instance.name

    def validate_contributor_name(self, value):
        """Validates the contributor name"""
        if not isinstance(value, str):
            raise ValidationError("contributor name must be a string")
        if not User.objects.filter(username=value).exists():
            raise ValidationError("contributor name is not a valid user")
        return {'contributor_name': value}

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        channel_name = self.context['view'].kwargs['channel_name']
        return api.add_contributor(validated_data['contributor_name'], channel_name)
