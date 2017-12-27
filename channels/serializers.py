"""
Serializers for channel REST APIs
"""
from datetime import (
    datetime,
    timezone,
)

from django.contrib.auth import get_user_model
from praw.models import Comment, MoreComments
from praw.models.reddit.submission import Submission
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.api import (
    Api,
    VALID_CHANNEL_TYPES,
    get_kind_mapping,
)


default_profile_image = "/static/images/avatar_default.png"

User = get_user_model()


class ChannelSerializer(serializers.Serializer):
    """Serializer for channels"""

    title = serializers.CharField()
    name = serializers.CharField(source='display_name')
    description = serializers.CharField(required=False, allow_blank=True)
    public_description = serializers.CharField(required=False, allow_blank=True)
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
            description=validated_data.get('description', ''),
            public_description=validated_data.get('public_description', ''),
        )

    def update(self, instance, validated_data):
        api = Api(user=self.context['request'].user)
        name = instance.display_name
        kwargs = {}
        if 'title' in validated_data:
            kwargs['title'] = validated_data['title']
        if 'subreddit_type' in validated_data:
            kwargs['channel_type'] = validated_data['subreddit_type']
        if 'description' in validated_data:
            kwargs['description'] = validated_data['description']
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
    removed = WriteableSerializerMethodField()
    stickied = serializers.BooleanField(required=False)
    score = serializers.IntegerField(source='ups', read_only=True)
    author_id = serializers.CharField(read_only=True, source='author')
    id = serializers.CharField(read_only=True)
    created = serializers.SerializerMethodField()
    num_comments = serializers.IntegerField(read_only=True)
    channel_name = serializers.SerializerMethodField()
    channel_title = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    edited = serializers.SerializerMethodField()

    def _get_user(self, instance):
        """
        Look up user in the context from the post author

        Args:
            instance (praw.models.Submission):
                The post to look up the user for
        """
        if instance.author is None:
            return None
        if 'users' in self.context:
            return self.context['users'].get(instance.author.name)
        else:
            return User.objects.filter(username=instance.author.name).first()

    def get_url(self, instance):
        """Returns a url or null depending on if it's a self post"""
        return instance.url if not instance.is_self else None

    def get_author_name(self, instance):
        """get the authors name"""
        user = self._get_user(instance)
        if user and user.profile.name:
            return user.profile.name
        return "[deleted]"

    def get_profile_image(self, instance):
        """Find the Profile for the comment author"""
        user = self._get_user(instance)
        if user and user.profile.image_small:
            return user.profile.image_small
        return default_profile_image

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

    def get_channel_title(self, instance):
        """The title of the channel"""
        return instance.subreddit.title

    def get_edited(self, instance):
        """Return a Boolean signifying if the post has been edited or not"""
        return instance.edited if instance.edited is False else True

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {'upvoted': _parse_bool(value, 'upvoted')}

    def get_removed(self, instance):
        """Returns True if the post was removed"""
        return instance.banned_by is not None

    def validate_removed(self, value):
        """Validate that removed is a bool"""
        return {'removed': _parse_bool(value, 'removed')}

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

        if "removed" in validated_data:
            removed = validated_data["removed"]
            if removed is True:
                api.remove_post(post_id)
            elif removed is False:
                api.approve_post(post_id)

        if "text" in validated_data:
            instance = api.update_post(post_id=post_id, text=validated_data['text'])

        if "stickied" in validated_data:
            sticky = validated_data["stickied"]
            api.pin_post(post_id, sticky)

        _apply_vote(instance, validated_data, False)
        return api.get_post(post_id=post_id)


class CommentSerializer(serializers.Serializer):
    """Serializer for comments"""
    id = serializers.CharField(read_only=True)
    parent_id = serializers.SerializerMethodField()
    post_id = serializers.SerializerMethodField()
    comment_id = serializers.CharField(write_only=True, allow_blank=True, required=False)
    text = serializers.CharField(source='body')
    author_id = serializers.SerializerMethodField()
    score = serializers.IntegerField(read_only=True)
    upvoted = WriteableSerializerMethodField()
    removed = WriteableSerializerMethodField()
    downvoted = WriteableSerializerMethodField()
    created = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    edited = serializers.SerializerMethodField()
    comment_type = serializers.SerializerMethodField()

    def _get_user(self, instance):
        """
        Look up user in the context from the comment author

        Args:
            instance (praw.models.Comment):
                The comment to look up the user for
        """

        if instance.author is None:
            return None
        if 'users' in self.context:
            return self.context['users'].get(instance.author.name)
        else:
            return User.objects.filter(username=instance.author.name).first()

    def get_post_id(self, instance):
        """The post id for this comment"""
        return instance.submission.id

    def get_parent_id(self, instance):
        """The parent id for this comment"""
        parent = instance.parent()

        if isinstance(parent, Submission):
            return None
        else:
            return parent.id

    def get_author_id(self, instance):
        """Get the author username or else [deleted]"""
        user = self._get_user(instance)
        if not user:
            return "[deleted]"
        return user.username

    def get_upvoted(self, instance):
        """Is a comment upvoted?"""
        return instance.likes is True

    def get_profile_image(self, instance):
        """Find the Profile for the comment author"""
        user = self._get_user(instance)

        if user and user.profile.image_small:
            return user.profile.image_small
        return default_profile_image

    def get_author_name(self, instance):
        """get the author name"""
        # this is a similar setup to the get_profile_image thingy above
        user = self._get_user(instance)

        if user and user.profile.name:
            return user.profile.name
        return "[deleted]"

    def get_downvoted(self, instance):
        """Is a comment downvoted?"""
        return instance.likes is False

    def get_created(self, instance):
        """The ISO-8601 formatted datetime for the creation time"""
        return datetime.fromtimestamp(instance.created, tz=timezone.utc).isoformat()

    def get_edited(self, instance):
        """Return a Boolean signifying if the comment has been edited or not"""
        return instance.edited if instance.edited is False else True

    def get_comment_type(self, instance):  # pylint: disable=unused-argument
        """Let the frontend know which type this is"""
        return "comment"

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {'upvoted': _parse_bool(value, 'upvoted')}

    def validate_downvoted(self, value):
        """Validate that downvoted is a bool"""
        return {'downvoted': _parse_bool(value, 'downvoted')}

    def get_removed(self, instance):
        """Returns True if the comment was removed"""
        return instance.banned_by is not None

    def validate_removed(self, value):
        """Validate that removed is a bool"""
        return {'removed': _parse_bool(value, 'removed')}

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

        if 'removed' in validated_data:
            if validated_data['removed'] is True:
                api.remove_comment(comment_id=instance.id)
            else:
                api.approve_comment(comment_id=instance.id)

        _apply_vote(instance, validated_data, True)

        return api.get_comment(comment_id=instance.id)


class MoreCommentsSerializer(serializers.Serializer):
    """
    Serializer for MoreComments objects
    """
    parent_id = serializers.SerializerMethodField()
    post_id = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    comment_type = serializers.SerializerMethodField()

    def get_parent_id(self, instance):
        """Returns the comment id for the parent comment, or None if the parent is a post"""
        kind, _id = instance.parent_id.split("_", 1)
        if kind == get_kind_mapping()['comment']:
            return _id
        return None

    def get_post_id(self, instance):
        """Returns the post id the comment belongs to"""
        return instance.submission.id

    def get_children(self, instance):
        """A list of comment ids for child comments that can be loaded"""
        return instance.children

    def get_comment_type(self, instance):  # pylint: disable=unused-argument
        """Let the frontend know which type this is"""
        return "more_comments"


class GenericCommentSerializer(serializers.Serializer):
    """
    Hack to serialize different types with only one entrypoint
    """

    def to_representation(self, instance):
        """
        Overrides the class method to add an extra field
        """
        if isinstance(instance, MoreComments):
            return MoreCommentsSerializer(instance, context=self.context).data
        elif isinstance(instance, Comment):
            return CommentSerializer(instance, context=self.context).data
        raise ValueError('Unknown type {} in the comments list'.format(type(instance)))


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


class ModeratorSerializer(serializers.Serializer):
    """Serializer for Moderators"""
    moderator_name = WriteableSerializerMethodField()

    def get_moderator_name(self, instance):
        """Returns the name for the moderator"""
        return instance.name

    def validate_moderator_name(self, value):
        """Validates the moderator name"""
        if not isinstance(value, str):
            raise ValidationError("moderator name must be a string")
        if not User.objects.filter(username=value).exists():
            raise ValidationError("moderator name is not a valid user")
        return {'moderator_name': value}

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        channel_name = self.context['view'].kwargs['channel_name']

        return api.add_moderator(validated_data['moderator_name'], channel_name)


class SubscriberSerializer(serializers.Serializer):
    """Serializer for subscriber"""
    subscriber_name = WriteableSerializerMethodField()

    def get_subscriber_name(self, instance):
        """Returns the name for the subscriber"""
        return instance.name

    def validate_subscriber_name(self, value):
        """Validates the subscriber name"""
        if not isinstance(value, str):
            raise ValidationError("subscriber name must be a string")
        if not User.objects.filter(username=value).exists():
            raise ValidationError("subscriber name is not a valid user")
        return {'subscriber_name': value}

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        channel_name = self.context['view'].kwargs['channel_name']
        return api.add_subscriber(validated_data['subscriber_name'], channel_name)
