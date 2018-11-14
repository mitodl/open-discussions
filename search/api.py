"""API for general search-related functionality"""
from elasticsearch_dsl import Q, Search

from channels.constants import (
    CHANNEL_TYPE_PUBLIC,
    CHANNEL_TYPE_RESTRICTED,
    COMMENT_TYPE,
    POST_TYPE,
    ROLE_CONTRIBUTORS,
    ROLE_MODERATORS,
)
from channels.models import ChannelGroupRole
from search.connection import get_conn, get_default_alias_name
from search.constants import ALIAS_ALL_INDICES


def get_reddit_object_type(reddit_obj):
    """
    Return the type of the given reddit object

    Args:
        reddit_obj (praw.models.reddit.submission.Submission, praw.models.reddit.comment.Comment):
            A PRAW post/'submission' or comment object

    Returns:
        str: A string constant indicating the object type
    """
    return COMMENT_TYPE if hasattr(reddit_obj, "submission") else POST_TYPE


def gen_post_id(reddit_obj_id):
    """
    Generates the Elasticsearch document id for a post

    Args:
        reddit_obj_id (int|str): The id of a reddit object as reported by PRAW

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "p_{}".format(reddit_obj_id)


def gen_comment_id(reddit_obj_id):
    """
    Generates the Elasticsearch document id for a comment

    Args:
        reddit_obj_id (int|str): The id of a reddit object as reported by PRAW

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "c_{}".format(reddit_obj_id)


def gen_profile_id(profile_id):
    """
    Generates the Elasticsearch document id for a profile

    Args:
        profile_id (str): The username of a Profile object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "u_{}".format(profile_id)


def is_reddit_object_removed(reddit_obj):
    """
    Indicates whether or not a given reddit object is considered to be removed by moderators

    Args:
        reddit_obj (praw.models.reddit.submission.Submission, praw.models.reddit.comment.Comment):
            A PRAW post/'submission' or comment object

    Returns:
        bool: True if the object is considered removed, False otherwise
    """
    return bool(reddit_obj.banned_by) and not reddit_obj.approved_by


# pylint: disable=invalid-unary-operand-type
def execute_search(*, user, query):
    """
    Execute a search based on the query

    Args:
        user (User): The user executing the search. Used to determine filters to enforce permissions.
        query (dict): The Elasticsearch query constructed in the frontend

    Returns:
        dict: The Elasticsearch response dict
    """
    index = get_default_alias_name(ALIAS_ALL_INDICES)
    search = Search(index=index, using=get_conn())
    search.update_from_dict(query)
    channel_names = (
        list(
            ChannelGroupRole.objects.filter(
                group__user=user, role__in=(ROLE_CONTRIBUTORS, ROLE_MODERATORS)
            )
            .values_list("channel__name", flat=True)
            .distinct()
        )
        if not user.is_anonymous
        else []
    )

    channels_filter = Q(
        "terms", channel_type=[CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_RESTRICTED]
    ) | ~Q("terms", object_type=[COMMENT_TYPE, POST_TYPE])

    if channel_names:
        channels_filter = channels_filter | Q("terms", channel_name=channel_names)

    search = search.filter(channels_filter)
    return search.execute().to_dict()
