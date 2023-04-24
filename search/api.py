"""API for general search-related functionality"""
from base64 import urlsafe_b64encode
from collections import Counter, defaultdict
from operator import itemgetter

from django.conf import settings
from opensearch_dsl import Q, Search
from opensearch_dsl.query import MoreLikeThis
from nested_lookup import nested_lookup

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
from course_catalog.models import FavoriteItem
from course_catalog.utils import get_list_items_by_resource
from open_discussions import features
from open_discussions.utils import extract_values
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    COURSE_TYPE,
    LEARNING_RESOURCE_TYPES,
    PODCAST_EPISODE_TYPE,
    PODCAST_TYPE,
    USER_LIST_TYPE,
    USER_PATH_TYPE,
)

RELATED_POST_RELEVANT_FIELDS = ["plain_text", "post_title", "author_id", "channel_name"]
SIMILAR_RESOURCE_RELEVANT_FIELDS = ["title", "short_description"]


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


def gen_content_file_id(key):
    """
    Generates the Elasticsearch document id for a ContentFile

    Args:
        run_id (str): The run id of a ContentFile object
        key (str): The key of a ContentFile object

    Returns:
        str: The Elasticsearch document id for this object
    """
    safe_key = urlsafe_b64encode(key.encode("utf-8")).decode("utf-8").rstrip("=")
    return "cf_{}".format(safe_key)


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


def gen_staff_list_id(staff_list_obj):
    """
    Generates the Elasticsearch document id for a StaffList

    Args:
        staff_list_obj (StaffList): The StaffList object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "staff_list_{}".format(staff_list_obj.id)


def gen_video_id(video_obj):
    """
    Generates the Elasticsearch document id for a Video

    Args:
        video_obj (Video): The Video object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "video_{}_{}".format(video_obj.platform, video_obj.video_id)


def gen_podcast_id(podcast_obj):
    """
    Generates the Elasticsearch document id for a Podcast

    Args:
        podcast_obj (Podcast): The Podcast object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "podcast_{}".format(podcast_obj.id)


def gen_podcast_episode_id(podcast_episode_obj):
    """
    Generates the Elasticsearch document id for a Podcast

    Args:
        podcast_episode_obj (PodcastEpisode): The PodcastEpisode object

    Returns:
        str: The Elasticsearch document id for this object
    """
    return "podcast_ep_{}".format(podcast_episode_obj.id)


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

    # Search public channels and channels user is a contributor/moderator of
    if channel_names:
        channels_filter = channels_filter | Q("terms", channel_name=channel_names)

    return search.filter(channels_filter).filter(content_filter)


# pylint: disable=invalid-unary-operand-type
def _apply_learning_query_filters(search, user):
    """
    Applies a series of filters to a Search object so permissions are respected, deleted
    objects are ignored, etc.

    search (elasticsearch_dsl.Search): Search object
    user (User): The user executing the search

    Returns:
        elasticsearch_dsl.Search: Search object with filters applied
    """
    # Search public user lists (and user's own lists if logged in)
    if features.is_enabled(features.USER_LIST_SEARCH):
        user_list_filter = Q("term", privacy_level=PrivacyLevel.public.value) | ~Q(
            "terms", object_type=[USER_LIST_TYPE, USER_PATH_TYPE]
        )
        if not user.is_anonymous:
            user_list_filter = user_list_filter | Q("term", author=user.id)
        search = search.filter(user_list_filter)
    else:
        search = search.exclude(
            Q("terms", object_type=[USER_LIST_TYPE, USER_PATH_TYPE])
        )
    if not features.is_enabled(features.PODCAST_SEARCH):
        # Exclude podcasts from the search results if the feature flag isn't enabled
        search = search.exclude(
            Q("terms", object_type=[PODCAST_TYPE, PODCAST_EPISODE_TYPE])
        )

    return search


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
    search = Search(index=index)
    search.update_from_dict(query)
    search = _apply_general_query_filters(search, user)
    return _transform_search_results_suggest(search.execute().to_dict())


def execute_learn_search(*, user, query):
    """
    Execute a learning resources search based on the query


    Args:
        user (User): The user executing the search. Used to determine filters to enforce permissions.
        query (dict): The Elasticsearch query constructed in the frontend

    Returns:
        dict: The Elasticsearch response dict
    """
    index = get_default_alias_name(ALIAS_ALL_INDICES)
    search = Search(index=index)
    search.update_from_dict(query)
    department_filters = nested_lookup("department_name", query.get("post_filter", {}))
    search = _apply_learning_query_filters(search, user)
    return transform_results(search.execute().to_dict(), user, department_filters)


def _transform_search_results_suggest(search_result):
    """
    Transform suggest results from elasticsearch

    Args:
        search_result (dict): The results from ElasticSearch

    Returns:
        dict: The Elasticsearch response dict with transformed suggestions
    """

    es_suggest = search_result.pop("suggest", {})
    if (
        search_result.get("hits", {}).get("total", 0)
        <= settings.ELASTICSEARCH_MAX_SUGGEST_HITS
    ):
        suggestion_dict = defaultdict(int)
        suggestions = [
            suggestion
            for suggestion_list in extract_values(es_suggest, "options")
            for suggestion in suggestion_list
            if suggestion["collate_match"] is True
        ]
        for suggestion in suggestions:
            suggestion_dict[suggestion["text"]] = (
                suggestion_dict[suggestion["text"]] + suggestion["score"]
            )
        search_result["suggest"] = [
            key
            for key, value in sorted(
                suggestion_dict.items(), key=lambda item: item[1], reverse=True
            )
        ][: settings.ELASTICSEARCH_MAX_SUGGEST_RESULTS]
    else:
        search_result["suggest"] = []

    return search_result


# pylint: disable=too-many-branches, too-many-locals
def transform_results(search_result, user, department_filters):
    """
    Transform podcast and podcast episode, and userlist and learning path in aggregations
    Add 'is_favorite' and 'lists' fields to the '_source' attributes for learning resources.

    Args:
        search_result (dict): The results from ElasticSearch
        user (User): the user who performed the search

    Returns:
        dict: The Elasticsearch response dict with transformed aggregates and source values
    """

    for aggregation_key in [
        "type",
        "topics",
        "offered_by",
        "audience",
        "certification",
        "department_name",
        "level",
        "course_feature_tags",
        "resource_type",
    ]:
        if f"agg_filter_{aggregation_key}" in search_result.get("aggregations", {}):
            if aggregation_key == "level":
                levels = (
                    search_result.get("aggregations", {})
                    .get(f"agg_filter_{aggregation_key}", {})
                    .get("level", {})
                    .get("level", {})
                )
                if levels:
                    search_result["aggregations"]["level"] = {
                        "buckets": [
                            {
                                "key": bucket["key"],
                                "doc_count": bucket["courses"]["doc_count"],
                            }
                            for bucket in levels.get("buckets", [])
                            if bucket["courses"]["doc_count"] > 0
                        ]
                    }
            else:
                search_result["aggregations"][aggregation_key] = search_result[
                    "aggregations"
                ][f"agg_filter_{aggregation_key}"][aggregation_key]
            search_result["aggregations"].pop(f"agg_filter_{aggregation_key}")

    types = search_result.get("aggregations", {}).get("type", {})

    if types:
        type_merges = dict(
            zip(
                (PODCAST_EPISODE_TYPE, USER_PATH_TYPE),
                (PODCAST_TYPE, USER_LIST_TYPE),
            )
        )

        for child_type, parent_type in type_merges.items():
            child_type_bucket = None
            parent_type_bucket = None

            for type_bucket in search_result["aggregations"]["type"]["buckets"]:
                if type_bucket["key"] == child_type:
                    child_type_bucket = type_bucket
                elif type_bucket["key"] == parent_type:
                    parent_type_bucket = type_bucket

            if child_type_bucket and parent_type_bucket:
                parent_type_bucket["doc_count"] = (
                    child_type_bucket["doc_count"] + parent_type_bucket["doc_count"]
                )
                search_result["aggregations"]["type"]["buckets"].remove(
                    child_type_bucket
                )
            elif child_type_bucket:
                child_type_bucket["key"] = parent_type

        search_result["aggregations"]["type"]["buckets"].sort(
            key=lambda bucket: bucket["doc_count"], reverse=True
        )

    if not user.is_anonymous:
        favorites = (
            FavoriteItem.objects.select_related("content_type")
            .filter(user=user)
            .values_list("content_type__model", "object_id")
        )
        for hit in search_result.get("hits", {}).get("hits", []):
            object_type = hit["_source"]["object_type"]
            if object_type in LEARNING_RESOURCE_TYPES:
                if object_type == USER_PATH_TYPE:
                    object_type = USER_LIST_TYPE
                object_id = hit["_source"]["id"]
                hit["_source"]["is_favorite"] = (object_type, object_id) in favorites
                hit["_source"]["lists"] = get_list_items_by_resource(
                    user, object_type, object_id
                )

    search_result = _transform_search_results_suggest(search_result)

    if len(department_filters) > 0:
        _transform_search_results_coursenum(search_result, department_filters)

    return search_result


def _transform_search_results_coursenum(search_result, department_filters):
    """
    Replace coursenum in search results with the smallest coursenum from a department in department_filters

    Args:
        search_result (dict): The results from ElasticSearch
        department_filters (list(string)): list of filtered departments
    """

    for hit in search_result.get("hits", {}).get("hits", []):
        department_course_numbers = hit.get("_source", {}).get(
            "department_course_numbers"
        )
        if department_course_numbers:
            filtered_department_course_numbers = [
                department_course_number
                for department_course_number in department_course_numbers
                if department_course_number["department"] in department_filters
            ]

            if len(filtered_department_course_numbers) > 0:
                filtered_department_course_numbers = sorted(
                    filtered_department_course_numbers, key=itemgetter("sort_coursenum")
                )

                hit["_source"]["coursenum"] = filtered_department_course_numbers[0][
                    "coursenum"
                ]


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
    search = Search(index=index)
    search = _apply_general_query_filters(search, user)
    search = search.query(
        MoreLikeThis(
            like={"_id": gen_post_id(post_id)},
            fields=RELATED_POST_RELEVANT_FIELDS,
            min_term_freq=1,
            min_doc_freq=1,
        )
    )
    # Limit results to the number indicated in settings
    search = search[0 : settings.OPEN_DISCUSSIONS_RELATED_POST_COUNT]
    return search.execute().to_dict()


def find_similar_resources(*, user, value_doc):
    """
    Execute a "more like this" query to find learning resources that are similar to the one provided.

     Args:
        user (User): The user executing the search
        value_doc (dict):
            a document representing the data fields we want to search with

    Returns:
        dict: The Elasticsearch response dict
    """
    index = get_default_alias_name(ALIAS_ALL_INDICES)
    search = Search(index=index)
    search = _apply_general_query_filters(search, user)
    search = search.filter(Q("terms", object_type=LEARNING_RESOURCE_TYPES))
    search = search.query(
        MoreLikeThis(
            like={"doc": value_doc, "fields": list(value_doc.keys())},
            fields=SIMILAR_RESOURCE_RELEVANT_FIELDS,
            min_term_freq=settings.OPEN_RESOURCES_MIN_TERM_FREQ,
            min_doc_freq=settings.OPEN_RESOURCES_MIN_DOC_FREQ,
        )
    )
    response = search.execute()

    if not user.is_anonymous:
        favorites = (
            FavoriteItem.objects.select_related("content_type")
            .filter(user=user)
            .values_list("content_type__model", "object_id")
        )

    objects = []

    for hit in response.hits:
        if getattr(hit, "id", False) and (
            hit["id"] != value_doc.get("id", None)
            or hit["object_type"] != value_doc.get("object_type", None)
        ):
            if user.is_anonymous:
                hit["is_favorite"] = False
                hit["lists"] = []
            else:
                object_type = hit["object_type"]
                if object_type in LEARNING_RESOURCE_TYPES:
                    if object_type == USER_PATH_TYPE:
                        object_type = USER_LIST_TYPE
                    object_id = hit["id"]
                    hit["is_favorite"] = (object_type, object_id) in favorites
                    hit["lists"] = get_list_items_by_resource(
                        user, object_type, object_id
                    )
            objects.append(hit.to_dict())
    return objects[0 : settings.OPEN_DISCUSSIONS_SIMILAR_RESOURCES_COUNT]


def get_similar_topics(value_doc, num_topics, min_term_freq, min_doc_freq):
    """
    Get a list of similar topics based on text values

    Args:
        value_doc (dict):
            a document representing the data fields we want to search with
        num_topics (int):
            number of topics to return
        min_term_freq (int):
            minimum times a term needs to show up in input
        min_doc_freq (int):
            minimum times a term needs to show up in docs

    Returns:
        list of str:
            list of topic values
    """
    index = get_default_alias_name(ALIAS_ALL_INDICES)
    search = Search(index=index)
    search = search.filter(Q("terms", object_type=[COURSE_TYPE]))
    search = search.query(
        MoreLikeThis(
            like=[{"doc": value_doc, "fields": list(value_doc.keys())}],
            fields=["course_id", "title", "short_description", "full_description"],
            min_term_freq=min_term_freq,
            min_doc_freq=min_doc_freq,
        )
    )
    search = search.source(includes="topics")

    response = search.execute()

    topics = [topic for hit in response.hits for topic in hit.topics]

    counter = Counter(topics)

    return list(dict(counter.most_common(num_topics)).keys())
