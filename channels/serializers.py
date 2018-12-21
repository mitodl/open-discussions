"""
Serializers for channel REST APIs
"""
# pylint: disable=too-many-lines
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

from django.contrib.auth import get_user_model
from praw.models import Comment, MoreComments
from praw.models.reddit.submission import Submission
from rest_framework import serializers
from rest_framework.exceptions import ValidationError, NotFound

from channels.utils import (
    get_kind_mapping,
    get_reddit_slug,
    get_kind_and_id,
    num_items_not_none,
)
from channels.constants import VALID_CHANNEL_TYPES, VALID_LINK_TYPES
from channels.models import Channel, Subscription, ChannelSubscription
from channels.proxies import proxy_post
from open_discussions.settings import SITE_BASE_URL
from open_discussions.utils import filter_dict_with_renamed_keys
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.models import Profile
from profiles.utils import image_uri

User = get_user_model()


class ChannelSerializer(serializers.Serializer):
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
    widget_list_id = serializers.IntegerField(
        required=False, allow_null=True, read_only=True
    )
    membership_is_managed = serializers.BooleanField(required=False)
    avatar = WriteableSerializerMethodField()
    avatar_small = serializers.SerializerMethodField()
    avatar_medium = serializers.SerializerMethodField()
    banner = WriteableSerializerMethodField()
    ga_tracking_id = serializers.CharField(required=False, allow_blank=True)

    def get_user_is_contributor(self, channel):
        """
        Get is_contributor from reddit object.
        For some reason reddit returns None instead of False so an explicit conversion is done here.
        """
        return bool(channel.user_is_contributor)

    def get_user_is_moderator(self, channel):
        """
        Get is_moderator from reddit object.
        For some reason reddit returns None instead of False so an explicit conversion is done here.
        """
        return bool(channel.user_is_moderator)

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

        channel_obj = channel._channel  # pylint: disable=protected-access

        avatar = validated_data.get("avatar")
        if avatar:
            channel_obj.avatar.save(f"channel_avatar_{name}.jpg", avatar, save=False)
            channel_obj.save(update_fields=["avatar"], update_image=True)

        banner = validated_data.get("banner")
        if banner:
            channel_obj.banner.save(f"channel_banner_{name}.jpg", banner, save=False)
            channel_obj.save(update_fields=["banner"], update_image=True)

        return channel


def _parse_bool(value, field_name):
    """Helper method to parse boolean values"""
    if value in serializers.BooleanField.TRUE_VALUES:
        return True
    if value in serializers.BooleanField.FALSE_VALUES:
        return False
    raise ValidationError("{} must be a bool".format(field_name))


class RedditObjectSerializer(serializers.Serializer):
    """Serializer class for reddit objects (posts, comments)"""

    def _get_user(self, instance):
        """
        Look up user in the context from the post author

        Args:
            instance (praw.models.Submission):
                The post to look up the user for
        """
        if instance.author is None:
            return None
        if "users" in self.context:
            return self.context["users"].get(instance.author.name)
        else:
            return (
                User.objects.filter(username=instance.author.name)
                .select_related("profile")
                .first()
            )

    def _get_profile(self, instance):
        """ Return a user profile if it exists, else None
        Args:
            instance (praw.models.Submission):
                The post to look up the user for

        Returns:
            profiles.models.Profile: the user profile if it exists
        """
        try:
            return self._get_user(instance).profile
        except (AttributeError, Profile.DoesNotExist):
            return None


class BasePostSerializer(RedditObjectSerializer):
    """
    Basic serializer class for reddit posts. Only includes serialization functionality
    (no deserialization or validation), and does not fetch/serialize Subscription data
    """

    url = WriteableSerializerMethodField(allow_null=True)
    url_domain = serializers.SerializerMethodField()
    thumbnail = WriteableSerializerMethodField(allow_null=True)
    text = WriteableSerializerMethodField(allow_null=True)
    article_content = serializers.JSONField(allow_null=True, default=None)
    title = serializers.CharField()
    slug = serializers.SerializerMethodField()
    upvoted = WriteableSerializerMethodField()
    removed = WriteableSerializerMethodField()
    ignore_reports = serializers.BooleanField(required=False, write_only=True)
    stickied = serializers.BooleanField(required=False)
    score = serializers.IntegerField(source="ups", read_only=True)
    author_id = serializers.CharField(read_only=True, source="author")
    id = serializers.CharField(read_only=True)
    created = serializers.SerializerMethodField()
    num_comments = serializers.IntegerField(read_only=True)
    channel_name = serializers.SerializerMethodField()
    channel_title = serializers.SerializerMethodField()
    channel_type = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    author_headline = serializers.SerializerMethodField()
    edited = serializers.SerializerMethodField()
    num_reports = serializers.IntegerField(read_only=True)
    deleted = serializers.SerializerMethodField()

    def get_url(self, instance):
        """Returns a url or null depending on if it's a self post"""
        return instance.url if not instance.is_self else None

    def get_url_domain(self, instance):
        """Returns the url's domain or None"""
        return urlparse(instance.url).hostname if not instance.is_self else None

    def get_thumbnail(self, instance):
        """Returns a thumbnail url or null"""
        if hasattr(instance, "article") and instance.article.cover_image_small:
            return urljoin(SITE_BASE_URL, instance.article.cover_image_small.url)
        return instance.link_meta.thumbnail if instance.link_meta is not None else None

    def get_slug(self, instance):
        """Returns the post slug"""
        return get_reddit_slug(instance.permalink)

    def get_author_name(self, instance):
        """get the authors name"""
        profile = self._get_profile(instance)
        if profile and profile.name:
            return profile.name
        return "[deleted]"

    def get_author_headline(self, instance):
        """ get the author's headline"""
        profile = self._get_profile(instance)
        if profile:
            return profile.headline
        return None

    def get_profile_image(self, instance):
        """Find the profile image for the post author"""
        return image_uri(self._get_profile(instance))

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

    def get_channel_type(self, instance):
        """The type of the channel"""
        return instance.subreddit.subreddit_type

    def get_edited(self, instance):
        """Return a Boolean signifying if the post has been edited or not"""
        return instance.edited if instance.edited is False else True

    def get_removed(self, instance):
        """Returns True if the post was removed"""
        return instance.banned_by is not None

    def get_deleted(self, instance):
        """Returns True if the post was deleted"""
        return instance.selftext == "[deleted]"  # only way to tell


class PostSerializer(BasePostSerializer):
    """
    Full serializer class for reddit posts. Includes deserialization and validation functionality
    and can fetch/serialize Subscription information.
    """

    cover_image = WriteableSerializerMethodField(allow_null=True)
    subscribed = WriteableSerializerMethodField()

    @property
    def _current_user(self):
        """Get the current user"""
        return self.context["current_user"]

    def get_cover_image(self, instance):
        """Get the cover image URL"""
        if hasattr(instance, "article") and instance.article.cover_image:
            return urljoin(SITE_BASE_URL, instance.article.cover_image.url)
        return None

    def get_subscribed(self, instance):
        """Returns True if user is subscrisbed to the post"""
        if "post_subscriptions" not in self.context:
            # this code is run if a post was just created
            return Subscription.objects.filter(
                user=self._current_user, post_id=instance.id, comment_id__isnull=True
            ).exists()
        return instance.id in self.context["post_subscriptions"]

    def validate_upvoted(self, value):
        """Validate that upvoted is a bool"""
        return {"upvoted": _parse_bool(value, "upvoted")}

    def validate_removed(self, value):
        """Validate that removed is a bool"""
        return {"removed": _parse_bool(value, "removed")}

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

    def validate_subscribed(self, value):
        """Validate that subscribed is a bool"""
        return {"subscribed": _parse_bool(value, "subscribed")}

    def validate_cover_image(self, value):
        """Validation that cover_image is a file"""
        if value is not None and not hasattr(value, "name"):
            raise ValidationError("Expected cover image to be a file")
        return {"cover_image": value}

    def create(self, validated_data):
        title = validated_data["title"]
        text = validated_data.get("text", None)
        url = validated_data.get("url", None)
        article_content = validated_data.get("article_content", None)
        cover_image = validated_data.get("cover_image", None)

        # validation occurs here rather than validate(), because we only wathc to do this for POST, not PATCH
        if num_items_not_none([text, url, article_content]) > 1:
            raise ValidationError(
                "Only one of text, article_content, or url can be used to create a post"
            )

        api = self.context["channel_api"]
        channel_name = self.context["view"].kwargs["channel_name"]
        try:
            post = api.create_post(
                channel_name,
                title=title,
                text=text,
                url=url,
                article_content=article_content,
                cover_image=cover_image,
            )
        except Channel.DoesNotExist as exc:
            raise NotFound("Channel doesn't exist") from exc

        api.add_post_subscription(post.id)

        changed = api.apply_post_vote(post, validated_data)

        if changed or cover_image:
            post = api.get_post(post_id=post.id)

        return post

    def update(self, instance, validated_data):  # pylint: disable=too-many-branches
        post_id = self.context["view"].kwargs["post_id"]

        if "url" in validated_data:
            raise ValidationError("Cannot edit url for a post")

        api = self.context["channel_api"]

        if "removed" in validated_data:
            removed = validated_data["removed"]
            if removed is True:
                api.remove_post(post_id)
            elif removed is False:
                api.approve_post(post_id)

        if "ignore_reports" in validated_data:
            ignore_reports = validated_data["ignore_reports"]
            if ignore_reports is True:
                api.approve_post(post_id)
                api.ignore_post_reports(post_id)

        if "text" in validated_data:
            instance = api.update_post(post_id=post_id, text=validated_data["text"])

        if "article_content" in validated_data:
            instance = api.update_post(
                post_id=post_id, article_content=validated_data["article_content"]
            )

        if "stickied" in validated_data:
            sticky = validated_data["stickied"]
            api.pin_post(post_id, sticky)

        if "subscribed" in validated_data:
            if validated_data["subscribed"] is True:
                api.add_post_subscription(post_id)
            elif validated_data["subscribed"] is False:
                api.remove_post_subscription(post_id)

        cover_image = validated_data.get("cover_image")
        if instance and cover_image and hasattr(instance, "article"):
            instance.article.cover_image.save(
                f"article_image_{post_id}.jpg", cover_image, save=False
            )
            instance.article.save(update_fields=["cover_image"], update_image=True)

        api.apply_post_vote(instance, validated_data)
        return api.get_post(post_id=post_id)


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
        return instance.body == "[deleted]"  # only way to tell


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
        return {"upvoted": _parse_bool(value, "upvoted")}

    def validate_downvoted(self, value):
        """Validate that downvoted is a bool"""
        return {"downvoted": _parse_bool(value, "downvoted")}

    def validate_subscribed(self, value):
        """Validate that subscribed is a bool"""
        return {"subscribed": _parse_bool(value, "subscribed")}

    def validate_removed(self, value):
        """Validate that removed is a bool"""
        return {"removed": _parse_bool(value, "removed")}

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

        from notifications.tasks import notify_subscribed_users

        notify_subscribed_users.delay(
            post_id, validated_data.get("comment_id", None), comment.id
        )

        if changed:
            return api.get_comment(comment.id)
        else:
            return comment

    def update(self, instance, validated_data):
        if validated_data.get("comment_id"):
            raise ValidationError("comment_id must be provided via URL")

        api = self.context["channel_api"]
        if "body" in validated_data:
            api.update_comment(comment_id=instance.id, text=validated_data["body"])

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


def _validate_username(key, value):
    """
    Helper function to validate the username
    """
    if not isinstance(value, str):
        raise ValidationError("username must be a string")
    if not User.objects.filter(username=value).exists():
        raise ValidationError("username is not a valid user")
    return {key: value}


def _validate_email(value):
    """
    Helper function to validate email
    """
    if not isinstance(value, str):
        raise ValidationError("email must be a string")
    if not User.objects.filter(email__iexact=value).exists():
        raise ValidationError("email does not exist")
    return {"email": value}


class ContributorSerializer(serializers.Serializer):
    """Serializer for contributors. Should be accessible by moderators only"""

    contributor_name = WriteableSerializerMethodField()
    email = WriteableSerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def get_contributor_name(self, instance):
        """Returns the name for the contributor"""
        return instance.name

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

    def validate_contributor_name(self, value):
        """Validates the contributor name"""
        return _validate_username("contributor_name", value)

    def validate_email(self, value):
        """Validates the contributor email"""
        return _validate_email(value)

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

    def get_moderator_name(self, instance):
        """Returns the name for the moderator"""
        return instance.name

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

    def validate_moderator_name(self, value):
        """Validates the moderator name"""
        return _validate_username("moderator_name", value)

    def validate_email(self, value):
        """Validates the moderator email"""
        return _validate_email(value)

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


class ReportSerializer(serializers.Serializer):
    """Serializer for reporting posts and comments"""

    post_id = serializers.CharField(required=False)
    comment_id = serializers.CharField(required=False)
    reason = serializers.CharField(max_length=100)

    def validate(self, attrs):
        """Validate data"""
        if "post_id" not in attrs and "comment_id" not in attrs:
            raise ValidationError(
                "You must provide one of either 'post_id' or 'comment_id'"
            )
        elif "post_id" in attrs and "comment_id" in attrs:
            raise ValidationError(
                "You must provide only one of either 'post_id' or 'comment_id', not both"
            )

        return attrs

    def create(self, validated_data):
        """Create a new report"""
        api = self.context["channel_api"]
        post_id = validated_data.get("post_id", None)
        comment_id = validated_data.get("comment_id", None)
        reason = validated_data["reason"]
        result = {"reason": reason}
        if post_id:
            api.report_post(post_id, reason)
            result["post_id"] = post_id
        else:
            api.report_comment(comment_id, reason)
            result["comment_id"] = comment_id
        return result


class ReportedContentSerializer(serializers.Serializer):
    """
    Serializer for reported content
    """

    comment = serializers.SerializerMethodField()
    post = serializers.SerializerMethodField()
    reasons = serializers.SerializerMethodField()

    def get_comment(self, instance):
        """Returns the comment if this report was for one"""
        if isinstance(instance, Comment):
            return CommentSerializer(instance, context=self.context).data

        return None

    def get_post(self, instance):
        """Returns the post if this report was for one"""
        if isinstance(instance, Submission):
            return PostSerializer(proxy_post(instance), context=self.context).data

        return None

    def get_reasons(self, instance):
        """
        Returns the reasons that have been reported so far

        Returns:
            list of str: list of reasons a post/comment has been reported for
        """
        return sorted(
            {report[0] for report in instance.user_reports + instance.mod_reports}
        )
