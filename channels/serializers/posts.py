"""
Serializers for post REST APIs
"""
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError, NotFound

from channels.api import get_post_type
from channels.constants import DELETED_COMMENT_OR_POST_TEXT
from channels.utils import get_reddit_slug, render_article_text
from channels.models import Channel, Subscription
from channels.serializers.base import RedditObjectSerializer
from channels.serializers.utils import parse_bool
from open_discussions.settings import SITE_BASE_URL
from open_discussions.serializers import WriteableSerializerMethodField
from open_discussions.utils import markdown_to_plain_text
from profiles.utils import image_uri

User = get_user_model()


class BasePostSerializer(RedditObjectSerializer):
    """
    Basic serializer class for PostProxy objects. Only includes serialization functionality
    (no deserialization or validation), and does not fetch/serialize Subscription data
    """

    url = WriteableSerializerMethodField(allow_null=True)
    url_domain = serializers.SerializerMethodField()
    thumbnail = WriteableSerializerMethodField(allow_null=True)
    text = WriteableSerializerMethodField(allow_null=True)
    article_content = serializers.JSONField(allow_null=True, default=None)
    plain_text = serializers.SerializerMethodField()
    title = serializers.CharField()
    post_type = serializers.CharField(read_only=True)
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
        """get the author's headline"""
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
        return instance.channel.name or instance.subreddit.display_name

    def get_channel_title(self, instance):
        """The title of the channel"""
        return instance.channel.title or instance.subreddit.title

    def get_channel_type(self, instance):
        """The type of the channel"""
        return instance.channel.channel_type or instance.subreddit.subreddit_type

    def get_edited(self, instance):
        """Return a Boolean signifying if the post has been edited or not"""
        return instance.edited if instance.edited is False else True

    def get_removed(self, instance):
        """Returns True if the post was removed"""
        return instance.banned_by is not None

    def get_deleted(self, instance):
        """Returns True if the post was deleted"""
        return instance.selftext == DELETED_COMMENT_OR_POST_TEXT  # only way to tell

    def get_plain_text(self, instance):
        """Return plain text content"""
        if instance.article is not None:
            return render_article_text(instance.article.content)
        elif instance.is_self:
            return markdown_to_plain_text(instance.selftext)
        else:
            return instance.preview_text


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
        if instance.article and instance.article.cover_image:
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
        return {"upvoted": parse_bool(value, "upvoted")}

    def validate_removed(self, value):
        """Validate that removed is a bool"""
        return {"removed": parse_bool(value, "removed")}

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
        return {"subscribed": parse_bool(value, "subscribed")}

    def validate_cover_image(self, value):
        """Validation that cover_image is a file, url or None"""
        if (
            value is not None
            and not hasattr(value, "name")
            and not urlparse(value).scheme
        ):
            raise ValidationError("Expected cover image to be a file or url")
        return {"cover_image": value}

    def create(self, validated_data):
        """Create a post"""
        from channels import task_helpers

        title = validated_data["title"]
        text = validated_data.get("text", None)
        url = validated_data.get("url", None)
        article_content = validated_data.get("article_content", None)
        cover_image = validated_data.get("cover_image", None)

        # Validation occurs here rather than validate(), because we only want to do this when we create posts,
        # not when we update them
        try:
            get_post_type(text=text, url=url, article_content=article_content)
        except ValueError as exc:
            raise ValidationError(exc.args[0]) from exc

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

        if not api.is_moderator(post.subreddit.display_name, post.author.name):
            task_helpers.check_post_for_spam(self.context["request"], post.id)

        return post

    def update(self, instance, validated_data):  # pylint: disable=too-many-branches
        """Update the post"""
        from channels import task_helpers

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

        update_kwargs = {}
        for attr in ("text", "article_content", "cover_image"):
            if attr in validated_data:
                update_kwargs[attr] = validated_data[attr]

        if update_kwargs:
            instance = api.update_post(post_id=post_id, **update_kwargs)

            if not api.is_moderator(
                instance.subreddit.display_name, instance.author.name
            ):
                task_helpers.check_post_for_spam(self.context["request"], post_id)

        if "stickied" in validated_data:
            sticky = validated_data["stickied"]
            api.pin_post(post_id, sticky)

        if "subscribed" in validated_data:
            if validated_data["subscribed"] is True:
                api.add_post_subscription(post_id)
            elif validated_data["subscribed"] is False:
                api.remove_post_subscription(post_id)

        api.apply_post_vote(instance, validated_data)

        return api.get_post(post_id=post_id)
