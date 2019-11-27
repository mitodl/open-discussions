"""API for general search-related functionality"""
import collections
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
from course_catalog.models import FavoriteItem, UserListItem
from open_discussions.utils import extract_values
from search.connection import get_conn, get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    GLOBAL_DOC_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
    LEARNING_RESOURCE_TYPES,
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    VIDEO_TYPE,
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


def gen_course_id(platform, course_id):
    """
    Generates the Elasticsearch document id for a course

    Args:
        platform (str): The platform of a Course object
        course_id (str): The course_id of a Course object

    Returns:
        str: The Elasticsearch document id for this object
    """
    safe_id = urlsafe_b64encode(course_id.encode("utf-8")).decode("utf-8").rstrip("=")
    return "co_{}_{}".format(platform, safe_id)


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


def gen_video_id(video_obj):
    """
    Generates the Elasticsearch document id for a Video

    Args:
        video_obj (Video): The Video object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "video_{}_{}".format(video_obj.platform, video_obj.video_id)


def gen_doc_ids(items):
    """
    Return a list of ES document ids for user favorites or list items

    Args:
        items(list of FavoriteItem or UserListItem): a user's favorites/list items

    Returns:
        list of str: the ES document ids for the favorited/list items

    """
    doc_ids = []
    for item in filter(lambda i: i.item is not None, items):
        classname = item.content_type.name
        if classname == COURSE_TYPE:
            doc_ids.append(gen_course_id(item.item.platform, item.item.course_id))
        elif classname == BOOTCAMP_TYPE:
            doc_ids.append(gen_bootcamp_id(item.item.course_id))
        elif classname == PROGRAM_TYPE:
            doc_ids.append(gen_program_id(item.item))
        elif classname == VIDEO_TYPE:
            doc_ids.append(gen_video_id(item.item))
        elif classname == USER_LIST_TYPE:
            doc_ids.append(gen_user_list_id(item.item))
    return doc_ids


def gen_lists_dict(user):
    """
    Return a dict of list ids for each item in a user's lists

    Args:
        user(User): a user to retrieve UserListItems for

    Returns:
        dict: a mapping of list ids (value) per resource item ES id (key)

    """
    lists_dict = collections.defaultdict(list)
    items = (
        UserListItem.objects.filter(user_list__author=user)
        .select_related("user_list")
        .iterator()
    )
    for item in items:
        lists_dict[gen_doc_ids([item])[0]].append(item.user_list.id)
    return lists_dict


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

    # Search public lists (and user's own lists if logged in)
    user_list_filter = Q("term", privacy_level=PrivacyLevel.public.value) | ~Q(
        "terms", object_type=[USER_LIST_TYPE, LEARNING_PATH_TYPE]
    )
    if not user.is_anonymous:
        user_list_filter = user_list_filter | Q("term", author=user.id)

    # Search public channels and channels user is a contributor/moderator of
    if channel_names:
        channels_filter = channels_filter | Q("terms", channel_name=channel_names)

    return (
        search.filter(channels_filter).filter(content_filter).filter(user_list_filter)
    )


def is_learning_query(query):
    """
    Return True if the query includes learning resource types, False otherwise

    Args:
        query (dict): The query sent to ElasticSearch

    Returns:
        bool: if the query includes learning resource types

    """
    object_types = set(extract_values(query, "object_type"))
    return len(object_types.intersection(set(LEARNING_RESOURCE_TYPES))) > 0


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
    if not user.is_anonymous and is_learning_query(query):
        search = search.script_fields(
            is_favorite={
                "script": {
                    "lang": "painless",
                    "source": "params.favorites.contains(doc._id.value)",
                    "params": {
                        "favorites": gen_doc_ids(FavoriteItem.objects.filter(user=user))
                    },
                }
            },
            lists={
                "script": {
                    "lang": "painless",
                    "source": "params.lists[doc._id.value]",
                    "params": {"lists": gen_lists_dict(user)},
                }
            },
        )
        search._source = True
    return transform_results(search.execute().to_dict())


def transform_results(search_result):
    """
    Transform the reverse nested availability aggregate counts into a format matching the other facets.
    Move 'is_favorite' and 'lists' fields to the '_source' attributes.

    Args:
        search_result (dict): The results from ElasticSearch

    Returns:
        dict: The Elasticsearch response dict with transformed availability aggregates and source values
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
    prices = search_result.get("aggregations", {}).get("cost", {}).pop("prices", {})
    if prices:
        search_result["aggregations"]["cost"]["buckets"] = [
            {"key": bucket["key"], "doc_count": bucket["courses"]["doc_count"]}
            for bucket in prices.pop("buckets", [])
            if bucket["courses"]["doc_count"] > 0
        ]
    for hit in search_result.get("hits", {}).get("hits", []):
        fields = hit.pop("fields", None)
        if fields:
            hit["_source"]["is_favorite"] = fields["is_favorite"][0]
            hit["_source"]["lists"] = (
                fields["lists"] if fields["lists"][0] is not None else []
            )
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
