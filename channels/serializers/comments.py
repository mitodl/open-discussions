"""Serializers for commment REST APIs"""
from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from praw.models import Comment, MoreComments
from praw.models.reddit.submission import Submission
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels import task_helpers
from channels.constants import DELETED_COMMENT_OR_POST_TEXT
from channels.utils import get_kind_mapping, get_kind_and_id, get_reddit_slug
from channels.models import Subscription
from channels.serializers.base import RedditObjectSerializer
from channels.serializers.utils import parse_bool
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.utils import image_uri

User = get_user_model()


class BaseCommentSerializer(RedditObjectSerializer):
    """
    Basic serializer class for reddit comments. Only includes serialization functionality
    (no deserialization or validation), and does not fetch/serialize Subscription data
    """

    id = serializers.CharField(read_only=True)
    parent_id = serializers.SerializerMethodField()
    post_id = serializers.SerializerMethodField()
    comment_id = serializers.CharField(
        write_only=True, allow_blank=True, required=False
    )
    text = serializers.CharField(source="body")
    author_id = serializers.SerializerMethodField()
    score = serializers.IntegerField(read_only=True)
    upvoted = WriteableSerializerMethodField()
    removed = WriteableSerializerMethodField()
    ignore_reports = serializers.BooleanField(required=False, write_only=True)
    downvoted = WriteableSerializerMethodField()
    created = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    author_headline = serializers.SerializerMethodField()
    edited = serializers.SerializerMethodField()
    comment_type = serializers.SerializerMethodField()
    num_reports = serializers.IntegerField(read_only=True)
    deleted = serializers.SerializerMethodField()

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
        return image_uri(self._get_profile(instance))

    def get_author_name(self, instance):
        """get the author name"""
        # this is a similar setup to the get_profile_image thingy above
        user = self._get_user(instance)

        if user and user.profile.name:
            return user.profile.name
        return "[deleted]"

    def get_author_headline(self, instance):
        """get the author headline"""
        user = self._get_user(instance)

        if user and user.profile:
            return user.profile.headline
        return None

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

    def get_removed(self, instance):
        """Returns True if the comment was removed"""
        return instance.banned_by is not None

    def get_deleted(self, instance):
        """Returns True if the comment was deleted"""
        return instance.body == DELETED_COMMENT_OR_POST_TEXT  # only way to tell

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("include_permalink_data", False):
            return {
                **data,
                "post_slug": get_reddit_slug(instance.submission.permalink),
                "channel_name": instance.submission.subreddit.display_name,
            }
        return data


class CommentSerializer(BaseCommentSerializer):
    """
    Full serializer class for reddit comments. Includes deserialization and validation functionality
    and can fetch/serialize Subscription information.
    """

    subscribed = WriteableSerializerMethodField()

    @property
    def _current_user(self):
        """Get the current user"""
        return self.context["current_user"]

    def get_subscribed(self, instance):
        """Returns True if user is subscribed to the comment"""
        if self.context.get("omit_subscriptions", False):
            return None
        if "comment_subscriptions" not in self.context:
            # this code is run if a comment was just created
            return Subscription.objects.filter(
                user=self._current_user,
                post_id=instance.submission.id,
                comment_id=instance.id,
            ).exists()
        return instance.id in self.context.get("comment_subscriptions", [])

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {"upvoted": parse_bool(value, "upvoted")}

    def validate_downvoted(self, value):
        """Validate that downvoted is a bool"""
        return {"downvoted": parse_bool(value, "downvoted")}

    def validate_subscribed(self, value):
        """Validate that subscribed is a bool"""
        return {"subscribed": parse_bool(value, "subscribed")}

    def validate_removed(self, value):
        """Validate that removed is a bool"""
        return {"removed": parse_bool(value, "removed")}

    def validate(self, attrs):
        """Validate that the the combination of fields makes sense"""
        if attrs.get("upvoted") and attrs.get("downvoted"):
            raise ValidationError("upvoted and downvoted cannot both be true")
        return attrs

    def create(self, validated_data):
        api = self.context["channel_api"]
        post_id = self.context["view"].kwargs["post_id"]

        kwargs = {}
        if validated_data.get("comment_id"):
            kwargs["comment_id"] = validated_data["comment_id"]
        else:
            kwargs["post_id"] = post_id

        comment = api.create_comment(text=validated_data["body"], **kwargs)

        api.add_comment_subscription(post_id, comment.id)

        changed = api.apply_comment_vote(comment, validated_data)

        if not api.is_moderator(comment.subreddit.display_name, comment.author.name):
            task_helpers.check_comment_for_spam(self.context["request"], comment.id)

        if changed:
            return api.get_comment(comment.id)
        else:
            return comment

    def update(self, instance, validated_data):
        if validated_data.get("comment_id"):
            raise ValidationError("comment_id must be provided via URL")

        api = self.context["channel_api"]
        if "body" in validated_data:
            text = validated_data["body"]
            api.update_comment(comment_id=instance.id, text=text)

            if not api.is_moderator(
                instance.subreddit.display_name, instance.author.name
            ):
                task_helpers.check_comment_for_spam(
                    self.context["request"], instance.id
                )

        if "removed" in validated_data:
            if validated_data["removed"] is True:
                api.remove_comment(comment_id=instance.id)
            else:
                api.approve_comment(comment_id=instance.id)

        if "ignore_reports" in validated_data:
            ignore_reports = validated_data["ignore_reports"]
            if ignore_reports is True:
                api.approve_comment(comment_id=instance.id)
                api.ignore_comment_reports(instance.id)

        if "subscribed" in validated_data:
            post_id = instance.submission.id
            if validated_data["subscribed"] is True:
                api.add_comment_subscription(post_id, instance.id)
            elif validated_data["subscribed"] is False:
                api.remove_comment_subscription(post_id, instance.id)

        api.apply_comment_vote(instance, validated_data)

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
        kind, _id = get_kind_and_id(instance.parent_id)
        if kind == get_kind_mapping()["comment"]:
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
        raise ValueError("Unknown type {} in the comments list".format(type(instance)))
