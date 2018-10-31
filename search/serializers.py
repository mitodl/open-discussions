"""Serializers for elasticsearch data"""
from channels.constants import POST_TYPE, COMMENT_TYPE
from channels.serializers import BasePostSerializer, BaseCommentSerializer
from channels.utils import get_reddit_slug
from profiles.models import Profile
from search.api import gen_post_id, gen_comment_id, gen_profile_id
from search.constants import PROFILE_TYPE
from open_discussions.utils import filter_dict_keys, filter_dict_with_renamed_keys


class ESSerializer:
    """
    Serializer class for Elasticsearch objects

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


class ESProfileSerializer(ESSerializer):
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
        from channels.api import Api

        client = Api(discussions_obj.user)
        return {
            "author_channel_membership": ",".join(
                [channel.display_name for channel in client.list_channels()]
            )
        }


class ESPostSerializer(ESSerializer):
    """Elasticsearch serializer class for posts"""

    object_type = POST_TYPE
    use_keys = [
        "author_id",
        "author_name",
        "author_headline",
        "channel_name",
        "channel_title",
        "text",
        "score",
        "created",
        "num_comments",
        "removed",
        "deleted",
    ]
    rename_keys = {
        "id": "post_id",
        "title": "post_title",
        "url": "post_link_url",
        "thumbnail": "post_link_thumbnail",
        "profile_image": "author_avatar_small",
        "slug": "post_slug",
    }

    @property
    def base_serializer(self):
        return BasePostSerializer

    def postprocess_fields(self, discussions_obj, serialized_data):
        return {
            "author_id": None
            if serialized_data["author_id"] == "[deleted]"
            else serialized_data["author_id"],
            "author_name": None
            if serialized_data["author_name"] == "[deleted]"
            else serialized_data["author_name"],
        }


class ESCommentSerializer(ESSerializer):
    """Elasticsearch serializer class for comments"""

    object_type = COMMENT_TYPE
    use_keys = [
        "author_id",
        "author_name",
        "author_headline",
        "text",
        "score",
        "created",
        "removed",
        "deleted",
    ]
    rename_keys = {
        "id": "comment_id",
        "parent_id": "parent_comment_id",
        "profile_image": "author_avatar_small",
    }

    @property
    def base_serializer(self):
        return BaseCommentSerializer

    def postprocess_fields(self, discussions_obj, serialized_data):
        return {
            "author_id": None
            if serialized_data["author_id"] == "[deleted]"
            else serialized_data["author_id"],
            "author_name": None
            if serialized_data["author_name"] == "[deleted]"
            else serialized_data["author_name"],
            "channel_title": discussions_obj.subreddit.title,
            "channel_name": discussions_obj.subreddit.display_name,
            "post_id": discussions_obj.submission.id,
            "post_title": discussions_obj.submission.title,
            "post_slug": get_reddit_slug(discussions_obj.submission.permalink),
        }


def _serialize_comment_tree_for_bulk(comments):
    """
    Serialize an iterable of Comment and their replies for a bulk API request

    Args:
        comments (iterable of Comment): An iterable of comments

    Yields:
        dict: Documents suitable for indexing in Elasticsearch
    """
    for comment in comments:
        yield serialize_comment_for_bulk(comment)
        yield from _serialize_comment_tree_for_bulk(comment.replies)


def serialize_bulk_post(post_obj):
    """
    Index a post

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    yield serialize_post_for_bulk(post_obj)


def serialize_bulk_comments(post_obj):
    """
    Index comments for a post and recurse to deeper level comments for a bulk API request

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    yield from _serialize_comment_tree_for_bulk(post_obj.comments)


def serialize_bulk_profiles(ids):
    """
    Serialize profiles for bulk indexing

    Args:
        ids(list of int): List of profile id's
    """
    for profile in Profile.objects.filter(id__in=ids).iterator():
        yield serialize_profile_for_bulk(profile)


def serialize_profile_for_bulk(profile_obj):
    """
    Serialize a profile for bulk API request

    Args:
        profile_obj (Profile): A user profile
    """
    return {
        "_id": gen_profile_id(profile_obj.user.username),
        **ESProfileSerializer().serialize(profile_obj),
    }


def serialize_post_for_bulk(post_obj):
    """
    Serialize a reddit Submission for a bulk API request

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    return {"_id": gen_post_id(post_obj.id), **ESPostSerializer().serialize(post_obj)}


def serialize_comment_for_bulk(comment_obj):
    """
    Serialize a comment for a bulk API request

    Args:
        comment_obj (Comment): A PRAW comment
    """
    return {
        "_id": gen_comment_id(comment_obj.id),
        **ESCommentSerializer().serialize(comment_obj),
    }
