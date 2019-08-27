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
    USER_LIST_TYPE,
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
    return "bootcamp_{}".format(safe_id)


def gen_program_id(program_obj):
    """
    Generates the Elasticsearch document id for a Program

    Args:
        program_obj (Program): The Program object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "program_{}".format(program_obj.id)


def gen_user_list_id(user_list_obj):
    """
    Generates the Elasticsearch document id for a UserList

    Args:
        user_list_obj (UserList): The UserList object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "user_list_{}".format(user_list_obj.id)


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
    # Get the list of channels a logged in user is a contributor/moderator of
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

    # Search for comments and posts from channels
    channels_filter = Q(
        "terms", channel_type=[CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_RESTRICTED]
    ) | ~Q("terms", object_type=[COMMENT_TYPE, POST_TYPE])

    # Exclude deleted comments and posts
    content_filter = (Q("term", deleted=False) & Q("term", removed=False)) | ~Q(
        "terms", object_type=[COMMENT_TYPE, POST_TYPE]
    )

    # Search only published courses and bootcamps
    published_filter = Q("term", published=True) | ~Q(
        "terms", object_type=[COURSE_TYPE, BOOTCAMP_TYPE]
    )

    # Search only courses/bootcamps with runs that have end_date null or > now, and enrollment date null or > now
    date_filter = ~Q("terms", object_type=[COURSE_TYPE, BOOTCAMP_TYPE]) | Q(
        "nested",
        path="course_runs",
        query=(
            (
                ~Q("exists", field="course_runs.best_end_date")
                | Q("term", course_runs__offered_by="OCW")
                | Q("range", course_runs__best_end_date={"gt": "now"})
            )
        ),
        ignore_unmapped=True,
    )

    # Search public lists (and user's own lists if logged in)
    user_list_filter = Q("term", privacy_level=PrivacyLevel.public.value) | ~Q(
        "terms", object_type=[USER_LIST_TYPE]
    )
    if not user.is_anonymous:
        user_list_filter = user_list_filter | Q("term", author=user.id)

    # Search public channels and channels user is a contributor/moderator of
    if channel_names:
        channels_filter = channels_filter | Q("terms", channel_name=channel_names)

    return (
        search.filter(channels_filter)
        .filter(content_filter)
        .filter(published_filter)
        .filter(date_filter)
        .filter(user_list_filter)
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
    return transform_aggregates(search.execute().to_dict())


def transform_aggregates(search_result):
    """
    Transform the reverse nested availability aggregate counts into a format matching the other facets

    Args:
        search_result (dict): The results from ElasticSearch

    Returns:
        dict: The Elasticsearch response dict with transformed availability aggregates
    """
    availability_runs = (
        search_result.get("aggregations", {}).get("availability", {}).pop("runs", {})
    )
    if availability_runs:
        search_result["aggregations"]["availability"]["buckets"] = [
            {"key": bucket["key"], "doc_count": bucket["courses"]["doc_count"]}
            for bucket in availability_runs.pop("buckets", [])
            if bucket["courses"]["doc_count"] > 0
        ]
    return search_result


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
