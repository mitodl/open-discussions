"""API for general search-related functionality"""
from base64 import urlsafe_b64encode

from elasticsearch_dsl import Q, Search
from elasticsearch_dsl.query import MoreLikeThis

from django.conf import settings
from channels.constants import (
    CHANNEL_TYPE_PUBLIC,
    CHANNEL_TYPE_RESTRICTED,
    COMMENT_TYPE,
    POST_TYPE,
    ROLE_CONTRIBUTORS,
    ROLE_MODERATORS,
)
from channels.models import ChannelGroupRole
from course_catalog.constants import PrivacyLevel
from search.connection import get_conn, get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    GLOBAL_DOC_TYPE,
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    LEARNING_PATH_TYPE,
)

RELATED_POST_RELEVANT_FIELDS = ["plain_text", "post_title", "author_id", "channel_name"]


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


def gen_course_id(course_id):
    """
    Generates the Elasticsearch document id for a course

    Args:
        course_id (str): The course_id of a Course object

    Returns:
        str: The Elasticsearch document id for this object
    """
    safe_id = urlsafe_b64encode(course_id.encode("utf-8")).decode("utf-8").rstrip("=")
    return "co_{}".format(safe_id)


def gen_bootcamp_id(bootcamp_id):
    """
    Generates the Elasticsearch document id for a bootcamp

    Args:
        bootcamp_id (str): The course_id of a Bootcamp object

    Returns:
        str: The Elasticsearch document id for this object
    """
    safe_id = urlsafe_b64encode(bootcamp_id.encode("utf-8")).decode("utf-8").rstrip("=")
    return "b_{}".format(safe_id)


def gen_program_id(program_obj):
    """
    Generates the Elasticsearch document id for a program

    Args:
        program_obj (Program): The Program object

    Returns:
        str: The Elasticsearch document id for this object
    """
    safe_id = (
        urlsafe_b64encode(program_obj.title.encode("utf-8"))
        .decode("utf-8")
        .rstrip("=")
        .replace(" ", "_")
    )
    return "prog_{}".format(safe_id)


def gen_learning_path_id(learning_path_obj):
    """
    Generates the Elasticsearch document id for a learning_path

    Args:
        learning_path_obj (LearningPath): The LearningPath object

    Returns:
        str: The Elasticsearch document id for this object
    """
    learning_path_id = str(learning_path_obj.author.username + learning_path_obj.title)
    safe_id = (
        urlsafe_b64encode(learning_path_id.encode("utf-8"))
        .decode("utf-8")
        .rstrip("=")
        .replace(" ", "_")
    )
    return "lp_{}".format(safe_id)


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
def _apply_general_query_filters(search, user):
    """
    Applies a series of filters to a Search object so permissions are respected, deleted
    objects are ignored, etc.

    search (elasticsearch_dsl.Search): Search object
    user (User): The user executing the search

    Returns:
        elasticsearch_dsl.Search: Search object with filters applied
    """
    channel_names = (
        sorted(
            list(
                ChannelGroupRole.objects.filter(
                    group__user=user, role__in=(ROLE_CONTRIBUTORS, ROLE_MODERATORS)
                )
                .values_list("channel__name", flat=True)
                .distinct()
            )
        )
        if not user.is_anonymous
        else []
    )

    channels_filter = Q(
        "terms", channel_type=[CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_RESTRICTED]
    ) | ~Q("terms", object_type=[COMMENT_TYPE, POST_TYPE])

    content_filter = (Q("term", deleted=False) & Q("term", removed=False)) | ~Q(
        "terms", object_type=[COMMENT_TYPE, POST_TYPE]
    )

    course_filter = Q("term", published=True) | ~Q("terms", object_type=[COURSE_TYPE])

    bootcamp_filter = Q("term", published=True) | ~Q(
        "terms", object_type=[BOOTCAMP_TYPE]
    )

    program_filter = ~Q("terms", object_type=[PROGRAM_TYPE])

    learning_path_filter = Q("term", privacy_level=PrivacyLevel.public.value) | ~Q(
        "terms", object_type=[LEARNING_PATH_TYPE]
    )

    if channel_names:
        channels_filter = channels_filter | Q("terms", channel_name=channel_names)

    return (
        search.filter(channels_filter)
        .filter(content_filter)
        .filter(course_filter)
        .filter(bootcamp_filter)
        .filter(program_filter)
        .filter(learning_path_filter)
    )


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
    search = _apply_general_query_filters(search, user)
    return search.execute().to_dict()


def find_related_documents(*, user, post_id):
    """
    Execute a "more like this" query to find posts that are related to a specific post

     Args:
        user (User): The user executing the search
        post_id (str): The id of the post that you want to find related posts for

    Returns:
        dict: The Elasticsearch response dict
    """
    index = get_default_alias_name(ALIAS_ALL_INDICES)
    search = Search(index=index, using=get_conn())
    search = _apply_general_query_filters(search, user)
    search = search.query(
        MoreLikeThis(
            like={"_id": gen_post_id(post_id), "_type": GLOBAL_DOC_TYPE},
            fields=RELATED_POST_RELEVANT_FIELDS,
            min_term_freq=1,
            min_doc_freq=1,
        )
    )
    # Limit results to the number indicated in settings
    search = search[0 : settings.OPEN_DISCUSSIONS_RELATED_POST_COUNT]
    return search.execute().to_dict()
