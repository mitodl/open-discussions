"""Serializers for elasticsearch data"""
import logging

from prawcore import NotFound
from rest_framework import serializers

from channels.constants import POST_TYPE, COMMENT_TYPE
from channels.models import Post, Comment
from profiles.api import get_channels
from profiles.models import Profile
from profiles.utils import image_uri
from search.api import gen_post_id, gen_comment_id, gen_profile_id
from search.constants import PROFILE_TYPE
from open_discussions.utils import filter_dict_keys, filter_dict_with_renamed_keys

log = logging.getLogger()


class ESModelSerializer(serializers.ModelSerializer):
    """
    Base ElasticSearch serializer for model-based objects
    """

    object_type = None

    def to_representation(self, instance):
        """Serializes the instance"""
        ret = super().to_representation(instance)
        ret["object_type"] = self.object_type
        return ret


class ESProxySerializer:
    """
    Serializer class for Elasticsearch objects that proxy to another serializer for serialization

    Attributes:
        object_type (str): String indicating the type of reddit/django object
        use_keys (list[str]):
            A list of keys from the base serializer results to use in the final serialized object
        rename_keys (dict(str, str)):
            A dict representing keys from the base serializer results that should be renamed for
            the final serialized object
    """

    object_type = None
    use_keys = []
    rename_keys = {}

    @property
    def base_serializer(self):
        """DRF Serializer class to use for the base serialization functionality"""
        raise NotImplementedError

    def postprocess_fields(
        self, discussions_obj, serialized_data
    ):  # pylint: disable=unused-argument
        """Returns a dict of additional or altered fields for the final serialized object"""
        return {}

    def serialize(self, discussions_obj):
        """
        Serializes a reddit or django model object by modifying the results from a base serializer class
        """
        base_serialized = self.base_serializer(discussions_obj).data
        serialized = {
            **filter_dict_keys(base_serialized, self.use_keys),
            **filter_dict_with_renamed_keys(base_serialized, self.rename_keys),
            "object_type": self.object_type,
        }
        return {**serialized, **self.postprocess_fields(discussions_obj, serialized)}


class ESProfileSerializer(ESProxySerializer):
    """
    Elasticsearch serializer class for profiles
    """

    object_type = PROFILE_TYPE
    use_keys = []
    rename_keys = {
        "username": "author_id",
        "name": "author_name",
        "bio": "author_bio",
        "headline": "author_headline",
        "profile_image_medium": "author_avatar_medium",
        "profile_image_small": "author_avatar_small",
    }

    @property
    def base_serializer(self):
        from profiles.serializers import ProfileSerializer

        return ProfileSerializer

    def postprocess_fields(self, discussions_obj, serialized_data):
        return {"author_channel_membership": sorted(get_channels(discussions_obj.user))}


class ESPostSerializer(ESModelSerializer):
    """Elasticsearch serializer class for posts"""

    object_type = POST_TYPE

    post_id = serializers.CharField(read_only=True)
    post_title = serializers.CharField(source="title", read_only=True)
    post_link_url = serializers.CharField(source="url", read_only=True)
    post_link_thumbnail = serializers.CharField(source="thumbnail_url", read_only=True)
    post_slug = serializers.CharField(source="slug", read_only=True)
    plain_text = serializers.CharField(read_only=True)

    author_avatar_small = serializers.SerializerMethodField()
    author_id = serializers.CharField(
        source="author.username", read_only=True, default=None
    )
    author_name = serializers.CharField(
        source="author.profile.name", read_only=True, default=None
    )
    author_headline = serializers.CharField(
        source="author.profile.headline", read_only=True, default=None
    )

    channel_name = serializers.CharField(source="channel.name", read_only=True)
    channel_title = serializers.CharField(source="channel.title", read_only=True)
    channel_type = serializers.CharField(source="channel.channel_type", read_only=True)

    article_content = serializers.JSONField(
        source="article.content", default=None, read_only=True
    )

    created = serializers.DateTimeField(source="created_on", read_only=True)

    def get_author_avatar_small(self, instance):
        """Returns the small profile image of the author"""
        profile = (
            instance.author.profile
            if instance.author and instance.author.profile
            else None
        )
        return image_uri(profile)

    class Meta:
        model = Post
        fields = (
            "post_type",
            "post_slug",
            "post_id",
            "post_title",
            "post_link_url",
            "post_link_thumbnail",
            "author_avatar_small",
            "author_id",
            "author_name",
            "author_headline",
            "channel_name",
            "channel_title",
            "channel_type",
            "article_content",
            "plain_text",
            "text",
            "score",
            "num_comments",
            "removed",
            "deleted",
            "created",
        )
        read_only_fields = (
            "post_type",
            "text",
            "score",
            "num_comments",
            "created",
            "removed",
            "deleted",
        )


class ESCommentSerializer(ESModelSerializer):
    """Elasticsearch serializer class for comments"""

    object_type = COMMENT_TYPE

    post_id = serializers.CharField(source="post.post_id", read_only=True)
    post_title = serializers.CharField(source="post.title", read_only=True)
    post_slug = serializers.CharField(source="post.slug", read_only=True)

    comment_id = serializers.CharField(read_only=True)
    parent_comment_id = serializers.CharField(source="parent_id", read_only=True)

    author_avatar_small = serializers.SerializerMethodField()
    author_id = serializers.CharField(
        source="author.username", read_only=True, default=None
    )
    author_name = serializers.CharField(
        source="author.profile.name", read_only=True, default=None
    )
    author_headline = serializers.CharField(
        source="author.profile.headline", read_only=True, default=None
    )

    channel_name = serializers.CharField(source="post.channel.name", read_only=True)
    channel_title = serializers.CharField(source="post.channel.title", read_only=True)
    channel_type = serializers.CharField(
        source="post.channel.channel_type", read_only=True
    )

    created = serializers.DateTimeField(source="created_on", read_only=True)

    def get_author_avatar_small(self, instance):
        """Returns the small profile image of the author"""
        profile = (
            instance.author.profile
            if instance.author and instance.author.profile
            else None
        )
        return image_uri(profile)

    class Meta:
        model = Comment
        fields = (
            "post_title",
            "post_id",
            "post_slug",
            "comment_id",
            "parent_comment_id",
            "author_avatar_small",
            "author_id",
            "author_name",
            "author_headline",
            "channel_name",
            "channel_title",
            "channel_type",
            "text",
            "score",
            "removed",
            "deleted",
            "created",
        )
        read_only_fields = ("text", "score", "created", "removed", "deleted")


def serialize_bulk_posts(post_ids):
    """
    Index a list of Post.ids

    Args:
        post_ids (list of int): a list of Post.id values to serialize

    Yields:
        iter of dict: yields an iterable of serialized posts
    """
    for post in Post.objects.filter(id__in=post_ids).prefetch_related(
        "article", "link_meta", "author", "author__profile"
    ):
        yield serialize_post_for_bulk(post)


def serialize_bulk_comments(comment_ids):
    """
    Index a list of Comment.ids

    Args:
        comment_ids (list of int): a list of Comment.ids to serialize

    Yields:
        iter of dict: yields an iterable of serialized comments
    """
    for comment in Comment.objects.filter(id__in=comment_ids).prefetch_related(
        "post", "author", "author__profile"
    ):
        yield serialize_comment_for_bulk(comment)


def serialize_bulk_profiles(ids):
    """
    Serialize profiles for bulk indexing

    Args:
        ids(list of int): List of profile id's

    Yields:
        iter of dict: yields an iterable of serialized profiles
    """
    for profile in Profile.objects.filter(id__in=ids).prefetch_related("user"):
        yield serialize_profile_for_bulk(profile)


def serialize_profile_for_bulk(profile_obj):
    """
    Serialize a profile for bulk API request

    Args:
        profile_obj (Profile): A user profile

    Returns:
        dict: the serialized profile
    """
    return {
        "_id": gen_profile_id(profile_obj.user.username),
        **ESProfileSerializer().serialize(profile_obj),
    }


def serialize_post_for_bulk(post_obj):
    """
    Serialize a reddit Submission for a bulk API request

    Args:
        post (channels.models.Post): A Post object

    Returns:
        dict: the serialized post
    """
    try:
        return {
            "_id": gen_post_id(post_obj.post_id),
            **ESPostSerializer(instance=post_obj).data,
        }
    except NotFound:
        log.exception("Reddit post not found: %s", post_obj.id)
        raise


def serialize_comment_for_bulk(comment_obj):
    """
    Serialize a comment for a bulk API request

    Args:
        comment_obj (channels.models.Comment): A Comment object

    Returns:
        dict: the serialized comment
    """
    try:
        return {
            "_id": gen_comment_id(comment_obj.comment_id),
            **ESCommentSerializer(instance=comment_obj).data,
        }
    except NotFound:
        log.exception("Reddit comment not found: %s", comment_obj.id)
        raise
