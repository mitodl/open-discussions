"""
Functions and constants for Elasticsearch indexing
"""
import json
import logging
from math import ceil

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from elasticsearch.exceptions import ConflictError, NotFoundError
from elasticsearch.helpers import BulkIndexError, bulk

from course_catalog.models import ContentFile, Course, LearningResourceRun
from open_discussions.utils import chunks
from search.api import gen_course_id
from search.connection import (
    get_active_aliases,
    get_conn,
    get_default_alias_name,
    get_reindexing_alias_name,
    make_backing_index_name,
    refresh_index,
)
from search.constants import (
    ALIAS_ALL_INDICES,
    COMMENT_TYPE,
    COURSE_TYPE,
    GLOBAL_DOC_TYPE,
    PODCAST_EPISODE_TYPE,
    PODCAST_TYPE,
    POST_TYPE,
    PROFILE_TYPE,
    PROGRAM_TYPE,
    STAFF_LIST_TYPE,
    USER_LIST_TYPE,
    USER_PATH_TYPE,
    VALID_OBJECT_TYPES,
    VIDEO_TYPE,
)
from search.exceptions import ReindexException
from search.serializers import (
    ESPostSerializer,
    serialize_bulk_comments,
    serialize_bulk_courses,
    serialize_bulk_courses_for_deletion,
    serialize_bulk_podcast_episodes,
    serialize_bulk_podcast_episodes_for_deletion,
    serialize_bulk_podcasts,
    serialize_bulk_podcasts_for_deletion,
    serialize_bulk_posts,
    serialize_bulk_profiles,
    serialize_bulk_profiles_for_deletion,
    serialize_bulk_programs,
    serialize_bulk_programs_for_deletion,
    serialize_bulk_staff_lists,
    serialize_bulk_staff_lists_for_deletion,
    serialize_bulk_user_lists,
    serialize_bulk_user_lists_for_deletion,
    serialize_bulk_videos,
    serialize_bulk_videos_for_deletion,
    serialize_content_file_for_bulk,
    serialize_content_file_for_bulk_deletion,
)

log = logging.getLogger(__name__)
User = get_user_model()

SCRIPTING_LANG = "painless"
UPDATE_CONFLICT_SETTING = "proceed"

ENGLISH_TEXT_FIELD = {
    "type": "text",
    "fields": {"english": {"type": "text", "analyzer": "english"}},
}

ENGLISH_TEXT_FIELD_WITH_SUGGEST = {
    "type": "text",
    "fields": {
        "english": {"type": "text", "analyzer": "english"},
        "trigram": {"type": "text", "analyzer": "trigram"},
    },
}

BASE_OBJECT_TYPE = {
    "object_type": {"type": "keyword"},
    "author_id": {"type": "keyword"},
    "author_name": {
        "type": "text",
        "fields": {
            "english": {"type": "text", "analyzer": "english"},
            "trigram": {"type": "text", "analyzer": "trigram"},
            "raw": {"type": "keyword"},
        },
    },
    "author_avatar_small": {"type": "keyword"},
    "author_headline": ENGLISH_TEXT_FIELD,
}

PROFILE_OBJECT_TYPE = {
    **BASE_OBJECT_TYPE,
    "author_bio": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "author_channel_membership": {"type": "keyword"},
    "author_channel_join_data": {
        "type": "nested",
        "properties": {"name": {"type": "keyword"}, "joined": {"type": "date"}},
    },
    "author_avatar_medium": {"type": "keyword"},
    "suggest_field1": {"type": "alias", "path": "author_name.trigram"},
    "suggest_field2": {"type": "alias", "path": "author_bio.trigram"},
}

CONTENT_OBJECT_TYPE = {
    **BASE_OBJECT_TYPE,
    "channel_name": {"type": "keyword"},
    "channel_title": ENGLISH_TEXT_FIELD,
    "channel_type": {"type": "keyword"},
    "text": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "score": {"type": "long"},
    "post_id": {"type": "keyword"},
    "post_title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "post_slug": {"type": "keyword"},
    "created": {"type": "date"},
    "deleted": {"type": "boolean"},
    "removed": {"type": "boolean"},
    "suggest_field1": {"type": "alias", "path": "post_title.trigram"},
    "suggest_field2": {"type": "alias", "path": "text.trigram"},
}


"""
Each resource index needs this relation even if it won't be used,
otherwise no results will be returned from indices without it.
"""
RESOURCE_RELATIONS = {
    "resource_relations": {"type": "join", "relations": {"resource": "resourcefile"}}
}

LEARNING_RESOURCE_TYPE = {
    **RESOURCE_RELATIONS,
    "title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "short_description": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "image_src": {"type": "keyword"},
    "topics": {"type": "keyword"},
    "audience": {"type": "keyword"},
    "certification": {"type": "keyword"},
    "offered_by": {"type": "keyword"},
    "created": {"type": "date"},
    "default_search_priority": {"type": "integer"},
    "minimum_price": {"type": "scaled_float", "scaling_factor": 100},
    "runs": {
        "type": "nested",
        "properties": {
            "id": {"type": "long"},
            "course_id": {"type": "keyword"},
            "title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
            "short_description": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
            "full_description": ENGLISH_TEXT_FIELD,
            "language": {"type": "keyword"},
            "level": {"type": "keyword"},
            "semester": {"type": "keyword"},
            "year": {"type": "keyword"},
            "start_date": {"type": "date"},
            "end_date": {"type": "date"},
            "enrollment_start": {"type": "date"},
            "enrollment_end": {"type": "date"},
            "topics": {"type": "keyword"},
            "instructors": {"type": "text"},
            "prices": {
                "type": "nested",
                "properties": {
                    "mode": {"type": "text"},
                    "price": {"type": "scaled_float", "scaling_factor": 100},
                },
            },
            "image_src": {"type": "keyword"},
            "published": {"type": "boolean"},
            "availability": {"type": "keyword"},
            "offered_by": {"type": "keyword"},
            "created": {"type": "date"},
            "slug": {"type": "keyword"},
        },
    },
}

COURSE_FILE_OBJECT_TYPE = {
    "run_id": {"type": "keyword"},
    "run_slug": {"type": "keyword"},
    "run_title": ENGLISH_TEXT_FIELD,
    "uid": {"type": "keyword"},
    "key": {"type": "keyword"},
    "url": {"type": "keyword"},
    "short_url": {"type": "keyword"},
    "section": {"type": "keyword"},
    "section_slug": {"type": "keyword"},
    "file_type": {"type": "keyword"},
    "content_type": {"type": "keyword"},
    "content": ENGLISH_TEXT_FIELD,
    "location": {"type": "keyword"},
    "resource_type": {"type": "keyword"},
}

COURSE_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    **COURSE_FILE_OBJECT_TYPE,
    "id": {"type": "long"},
    "course_id": {"type": "keyword"},
    "full_description": ENGLISH_TEXT_FIELD,
    "platform": {"type": "keyword"},
    "published": {"type": "boolean"},
    "department_name": {"type": "keyword"},
    "course_feature_tags": {"type": "keyword"},
    "coursenum": {"type": "keyword"},
    "department_course_numbers": {
        "type": "nested",
        "properties": {
            "coursenum": {"type": "keyword"},
            "sort_coursenum": {"type": "keyword"},
            "department": {"type": "keyword"},
            "primary": {"type": "boolean"},
        },
    },
}


PROGRAM_OBJECT_TYPE = {**LEARNING_RESOURCE_TYPE, "id": {"type": "long"}}

LIST_OBJECT_TYPE = {
    **RESOURCE_RELATIONS,
    "audience": {"type": "keyword"},
    "certification": {"type": "keyword"},
    "id": {"type": "long"},
    "title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "short_description": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "image_src": {"type": "keyword"},
    "topics": {"type": "keyword"},
    "author": {"type": "keyword"},
    "privacy_level": {"type": "keyword"},
    "list_type": {"type": "keyword"},
    "created": {"type": "date"},
    "default_search_priority": {"type": "integer"},
    "minimum_price": {"type": "scaled_float", "scaling_factor": 100},
}

VIDEO_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "video_id": {"type": "keyword"},
    "platform": {"type": "keyword"},
    "full_description": ENGLISH_TEXT_FIELD,
    "transcript": ENGLISH_TEXT_FIELD,
    "published": {"type": "boolean"},
}

PODCAST_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "full_description": ENGLISH_TEXT_FIELD,
    "url": {"type": "keyword"},
}

PODCAST_EPISODE_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "podcast_id": {"type": "long"},
    "series_title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "full_description": ENGLISH_TEXT_FIELD,
    "url": {"type": "keyword"},
    "last_modified": {"type": "date"},
}

MAPPING = {
    POST_TYPE: {
        **CONTENT_OBJECT_TYPE,
        "post_link_url": {"type": "keyword"},
        "post_link_thumbnail": {"type": "keyword"},
        "num_comments": {"type": "long"},
        "plain_text": ENGLISH_TEXT_FIELD,
        "post_type": {"type": "keyword"},
    },
    COMMENT_TYPE: {
        **CONTENT_OBJECT_TYPE,
        "comment_id": {"type": "keyword"},
        "parent_comment_id": {"type": "keyword"},
        "parent_post_removed": {"type": "boolean"},
    },
    PROFILE_TYPE: PROFILE_OBJECT_TYPE,
    COURSE_TYPE: COURSE_OBJECT_TYPE,
    PROGRAM_TYPE: PROGRAM_OBJECT_TYPE,
    USER_LIST_TYPE: LIST_OBJECT_TYPE,
    USER_PATH_TYPE: LIST_OBJECT_TYPE,
    STAFF_LIST_TYPE: LIST_OBJECT_TYPE,
    VIDEO_TYPE: VIDEO_OBJECT_TYPE,
    PODCAST_TYPE: PODCAST_OBJECT_TYPE,
    PODCAST_EPISODE_TYPE: PODCAST_EPISODE_OBJECT_TYPE,
}


def clear_and_create_index(*, index_name=None, skip_mapping=False, object_type=None):
    """
    Wipe and recreate index and mapping. No indexing is done.

    Args:
        index_name (str): The name of the index to clear
        skip_mapping (bool): If true, don't set any mapping
        object_type(str): The type of document (post, comment)
    """
    if object_type not in VALID_OBJECT_TYPES:
        raise ValueError(
            "A valid object type must be specified when clearing and creating an index"
        )
    conn = get_conn()
    if conn.indices.exists(index_name):
        conn.indices.delete(index_name)
    index_create_data = {
        "settings": {
            "index": {
                "number_of_shards": settings.ELASTICSEARCH_SHARD_COUNT,
                "number_of_replicas": settings.ELASTICSEARCH_REPLICA_COUNT,
                "refresh_interval": "60s",
            },
            "analysis": {
                "analyzer": {
                    "folding": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": [
                            "lowercase",
                            "asciifolding",  # remove accents if we use folding analyzer
                        ],
                    },
                    "trigram": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "shingle"],
                    },
                },
                "filter": {
                    "shingle": {
                        "type": "shingle",
                        "min_shingle_size": 2,
                        "max_shingle_size": 3,
                    }
                },
            },
        }
    }
    if not skip_mapping:
        index_create_data["mappings"] = {
            GLOBAL_DOC_TYPE: {"properties": MAPPING[object_type]}
        }
    # from https://www.elastic.co/guide/en/elasticsearch/guide/current/asciifolding-token-filter.html
    conn.indices.create(index_name, body=index_create_data)


def create_document(doc_id, data):
    """
    Makes a request to ES to create a new document

    Args:
        doc_id (str): The ES document id
        data (dict): Full ES document data
    """
    conn = get_conn()
    for alias in get_active_aliases(conn, object_types=[data["object_type"]]):
        conn.create(index=alias, doc_type=GLOBAL_DOC_TYPE, body=data, id=doc_id)


def delete_document(doc_id, object_type, **kwargs):
    """
    Makes a request to ES to delete a document

    Args:
        doc_id (str): The ES document id
        object_type (str): The object type
        kwargs (dict): optional parameters for the request
    """
    conn = get_conn()
    for alias in get_active_aliases(conn, object_types=[object_type]):
        try:
            conn.delete(index=alias, doc_type=GLOBAL_DOC_TYPE, id=doc_id, params=kwargs)
        except NotFoundError:
            log.debug(
                "Tried to delete an ES document that didn't exist, doc_id: '%s'", doc_id
            )


def update_field_values_by_query(query, field_dict, object_types=None):
    """
    Makes a request to ES to use the update_by_query API to update one or more field
    values for all documents that match the given query.

    Args:
        query (dict): A dict representing an ES query
        field_dict (dict): dictionary of fields with values to update
        object_types (list of str): The object types to query (post, comment, etc)
    """
    sources = []
    params = {}
    for (field_name, field_value) in field_dict.items():
        new_param = "new_value_{}".format(field_name)
        sources.append("ctx._source['{}'] = params.{}".format(field_name, new_param))
        params.update({new_param: field_value})
    if not object_types:
        object_types = VALID_OBJECT_TYPES
    conn = get_conn()
    for alias in get_active_aliases(conn, object_types=object_types):
        es_response = conn.update_by_query(  # pylint: disable=unexpected-keyword-arg
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            conflicts=UPDATE_CONFLICT_SETTING,
            body={
                "script": {
                    "source": ";".join([source for source in sources]),
                    "lang": SCRIPTING_LANG,
                    "params": params,
                },
                **query,
            },
        )
        # Our policy for document update-related version conflicts right now is to log them
        # and allow the app to continue as normal.
        num_version_conflicts = es_response.get("version_conflicts", 0)
        if num_version_conflicts > 0:
            log.error(
                "Update By Query API request resulted in %s version conflict(s) (alias: %s, query: %s)",
                num_version_conflicts,
                alias,
                query,
            )


def _update_document_by_id(doc_id, body, object_type, *, retry_on_conflict=0, **kwargs):
    """
    Makes a request to ES to update an existing document

    Args:
        doc_id (str): The ES document id
        body (dict): ES update operation body
        object_type (str): The object type to update (post, comment, etc)
        retry_on_conflict (int): Number of times to retry if there's a conflict (default=0)
        kwargs (dict): Optional kwargs to be passed to ElasticSearch
    """
    conn = get_conn()
    for alias in get_active_aliases(conn, object_types=[object_type]):
        try:
            conn.update(
                index=alias,
                doc_type=GLOBAL_DOC_TYPE,
                body=body,
                id=doc_id,
                params={"retry_on_conflict": retry_on_conflict, **kwargs},
            )
        # Our policy for document update-related version conflicts right now is to log them
        # and allow the app to continue as normal.
        except ConflictError:
            log.error(
                "Update API request resulted in a version conflict (alias: %s, doc id: %s)",
                alias,
                doc_id,
            )


def update_document_with_partial(doc_id, doc, object_type, *, retry_on_conflict=0):
    """
    Makes a request to ES to update an existing document

    Args:
        doc_id (str): The ES document id
        doc (dict): Full or partial ES document
        object_type (str): The object type to update (post, comment, etc)
        retry_on_conflict (int): Number of times to retry if there's a conflict (default=0)
    """
    _update_document_by_id(
        doc_id, {"doc": doc}, object_type, retry_on_conflict=retry_on_conflict
    )


def upsert_document(doc_id, doc, object_type, *, retry_on_conflict=0, **kwargs):
    """
    Makes a request to ES to create or update a document

    Args:
        doc_id (str): The ES document id
        doc (dict): Full ES document
        object_type (str): The object type to update (post, comment, etc)
        retry_on_conflict (int): Number of times to retry if there's a conflict (default=0)
        kwargs (dict): Optional kwargs to be passed to ElasticSearch
    """
    _update_document_by_id(
        doc_id,
        {"doc": doc, "doc_as_upsert": True},
        object_type,
        retry_on_conflict=retry_on_conflict,
        **kwargs,
    )


def increment_document_integer_field(doc_id, field_name, incr_amount, object_type):
    """
    Makes a request to ES to increment some integer field in a document

    Args:
        doc_id (str): The ES document id
        object_type (str): The object type to update (post, comment, etc)
        field_name (str): The name of the field to increment
        incr_amount (int): The amount to increment by
    """
    _update_document_by_id(  # pylint: disable=redundant-keyword-arg
        doc_id,
        {
            "script": {
                "source": "ctx._source.{} += params.incr_amount".format(field_name),
                "lang": SCRIPTING_LANG,
                "params": {"incr_amount": incr_amount},
            }
        },
        object_type,
    )


def update_post(doc_id, post):
    """
    Serializes a Post object and updates it in the index

    Args:
        doc_id (str): The ES document id
        post (channels.models.Post): A Post object
    """
    return update_document_with_partial(
        doc_id, ESPostSerializer(instance=post).data, POST_TYPE
    )


def delete_items(documents, object_type, update_only, **kwargs):
    """
    Calls index_items with error catching around not_found for objects that don't exist
    in the index

    Args:
        documents (iterable of dict): An iterable with ElasticSearch documents to index
        object_type (str): the ES object type
        update_only (bool): Update existing index only

    """

    try:
        index_items(documents, object_type, update_only, **kwargs)
    except BulkIndexError as error:
        error_messages = error.args[1]

        for message in error_messages:
            message = list(message.values())[0]
            if message["result"] != "not_found":
                log.error("Bulk deletion failed. Error: %s", str(message))
                raise ReindexException(f"Bulk deletion failed: {message}")


def index_items(documents, object_type, update_only, **kwargs):
    """
    Index items based on list of item ids

    Args:
        documents (iterable of dict): An iterable with ElasticSearch documents to index
        object_type (str): the ES object type
        update_only (bool): Update existing index only

    """
    conn = get_conn()
    # bulk will also break an iterable into chunks. However we should do this here so that
    # we can use the same documents when indexing to multiple aliases.
    for chunk in chunks(
        documents, chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE
    ):
        documents_size = len(json.dumps(chunk))
        # Keep chunking the chunks until either the size is acceptable or there's nothing left to chunk
        if documents_size > settings.ELASTICSEARCH_MAX_REQUEST_SIZE:
            if len(chunk) == 1:
                log.error(
                    "Document id %s for object_type %s exceeds max size %d: %d",
                    chunk[0]["_id"],
                    object_type,
                    settings.ELASTICSEARCH_MAX_REQUEST_SIZE,
                    documents_size,
                )
                continue
            num_chunks = min(
                ceil(
                    len(chunk)
                    / ceil(documents_size / settings.ELASTICSEARCH_MAX_REQUEST_SIZE)
                ),
                len(chunk) - 1,
            )
            for smaller_chunk in chunks(chunk, chunk_size=num_chunks):
                index_items(smaller_chunk, object_type, update_only, **kwargs)
        else:
            for alias in get_active_aliases(
                conn, object_types=[object_type], include_reindexing=(not update_only)
            ):
                _, errors = bulk(
                    conn,
                    chunk,
                    index=alias,
                    doc_type=GLOBAL_DOC_TYPE,
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                    **kwargs,
                )
                if len(errors) > 0:
                    log.error(errors)
                    raise ReindexException(
                        f"Error during bulk {object_type} insert: {errors}"
                    )


def index_posts(ids, update_only=False):
    """
    Index a list of posts by id

    Args:
        ids(list of int): List of Post id's
        update_only (bool): Update existing index only
    """
    index_items(serialize_bulk_posts(ids), POST_TYPE, update_only)


def index_comments(ids, update_only=False):
    """
    Index a list of comments by id

    Args:
        ids(list of int): List of Comment id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_comments(ids), COMMENT_TYPE, update_only)


def index_profiles(ids, update_only=False):
    """
    Index a list of profiles by id

    Args:
        ids(list of int): List of Profile id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_profiles(ids), PROFILE_TYPE, update_only)


def delete_profiles(ids):
    """
    Delete a list of profiles by id

    Args:
        ids(list of int): List of Profile ids
    """
    delete_items(serialize_bulk_profiles_for_deletion(ids), PROFILE_TYPE, True)


def index_courses(ids, update_only=False):
    """
    Index a list of courses by id

    Args:
        ids(list of int): List of Course id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_courses(ids), COURSE_TYPE, update_only)


def delete_courses(ids):
    """
    Delete a list of courses by id

    Args:
        ids(list of int): List of Course id's
    """
    delete_items(serialize_bulk_courses_for_deletion(ids), COURSE_TYPE, True)

    course_content_type = ContentType.objects.get_for_model(Course)
    for run_id in LearningResourceRun.objects.filter(
        object_id__in=ids, content_type=course_content_type
    ).values_list("id", flat=True):
        delete_run_content_files(run_id)


def index_course_content_files(course_ids, update_only=False):
    """
    Index a list of content files by course ids

    Args:
        course_ids(list of int): List of Course id's
        update_only (bool): Update existing index only

    """
    course_content_type = ContentType.objects.get_for_model(Course)
    for run_id in LearningResourceRun.objects.filter(
        object_id__in=course_ids, content_type=course_content_type
    ).values_list("id", flat=True):
        index_run_content_files(run_id, update_only=update_only)


def index_run_content_files(run_id, update_only=False):
    """
    Index a list of content files by run id

    Args:
        run_id(int): Course run id
        update_only (bool): Update existing index only

    """
    run = LearningResourceRun.objects.get(pk=run_id)
    content_file_ids = run.content_files.filter(published=True).values_list(
        "id", flat=True
    )

    for ids_chunk in chunks(
        content_file_ids, chunk_size=settings.ELASTICSEARCH_DOCUMENT_INDEXING_CHUNK_SIZE
    ):

        documents = (
            serialize_content_file_for_bulk(content_file)
            for content_file in ContentFile.objects.filter(pk__in=ids_chunk)
            .select_related("run")
            .prefetch_related("run__content_object")
            .defer("run__raw_json")
        )

        index_items(
            documents,
            COURSE_TYPE,
            update_only,
            routing=gen_course_id(
                run.content_object.platform, run.content_object.course_id
            ),
        )


def delete_run_content_files(run_id, unpublished_only=False):
    """
    Delete a list of content files by run from the index

    Args:
        run_id(int): Course run id
        unpublished_only(bool): if true only delete  files with published=False

    """
    run = LearningResourceRun.objects.get(id=run_id)
    if unpublished_only:
        content_files = run.content_files.filter(published=False).only("key")
    else:
        content_files = run.content_files.only("key")

    if not content_files.exists():
        return

    documents = (
        serialize_content_file_for_bulk_deletion(content_file)
        for content_file in content_files
    )

    course = run.content_object
    delete_items(
        documents,
        COURSE_TYPE,
        True,
        routing=gen_course_id(course.platform, course.course_id),
    )


def index_programs(ids, update_only=False):
    """
    Index a list of programs by id

    Args:
        ids(list of int): List of Program id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_programs(ids), PROGRAM_TYPE, update_only)


def delete_programs(ids):
    """
    Delete a list of programs by id

    Args:
        ids(list of int): List of Program id's
    """
    delete_items(serialize_bulk_programs_for_deletion(ids), PROGRAM_TYPE, True)


def index_user_lists(ids, update_only=False):
    """
    Index a list of user lists by id

    Args:
        ids(list of int): List of UserList id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_user_lists(ids), USER_LIST_TYPE, update_only)


def delete_user_lists(ids):
    """
    Delete a list of user lists by id

    Args:
        ids(list of int): List of UserList ids

    """
    delete_items(serialize_bulk_user_lists_for_deletion(ids), USER_LIST_TYPE, True)


def index_staff_lists(ids, update_only=False):
    """
    Index a list of staff lists by id

    Args:
        ids(list of int): List of StaffList id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_staff_lists(ids), STAFF_LIST_TYPE, update_only)


def delete_staff_lists(ids):
    """
    Delete a list of staff lists by id

    Args:
        ids(list of int): List of StaffList ids

    """
    delete_items(serialize_bulk_staff_lists_for_deletion(ids), STAFF_LIST_TYPE, True)


def index_videos(ids, update_only=False):
    """
    Index a list of videos by id

    Args:
        ids(list of int): List of Video id's
        update_only (bool): Update existing index only

    """
    index_items(serialize_bulk_videos(ids), VIDEO_TYPE, update_only)


def delete_videos(ids):
    """
    Delete a list of videos by id

    Args:
        ids(list of int): List of video ids

    """
    delete_items(serialize_bulk_videos_for_deletion(ids), VIDEO_TYPE, True)


def index_podcasts(ids, update_only=False):
    """
    Index a list of podcasts by id

    Args:
        ids(list of int): List of Podcast id's
        update_only (bool): Update existing index only
    """
    index_items(serialize_bulk_podcasts(ids), PODCAST_TYPE, update_only)


def delete_podcasts(ids):
    """
    Delete a list of podcasts by id

    Args:
        ids(list of int): List of podcast ids

    """
    delete_items(serialize_bulk_podcasts_for_deletion(ids), PODCAST_TYPE, True)


def index_podcast_episodes(ids, update_only=False):
    """
    Index a list of podcast episodes by id

    Args:
        ids(list of int): List of PodcastEpisode id's
        update_only (bool): Update existing index only
    """
    index_items(serialize_bulk_podcast_episodes(ids), PODCAST_EPISODE_TYPE, update_only)


def delete_podcast_episodes(ids):
    """
    Delete a list of podcast episodes by id

    Args:
        ids(list of int): List of PodcastEpisode ids
    """
    delete_items(
        serialize_bulk_podcast_episodes_for_deletion(ids), PODCAST_EPISODE_TYPE, True
    )


def create_backing_index(object_type):
    """
    Start the reindexing process by creating a new backing index and pointing the reindex alias toward it

    Args:
        object_type (str): The object type for the index (post, comment, etc)

    Returns:
        str: The new backing index
    """
    conn = get_conn()

    # Create new backing index for reindex
    new_backing_index = make_backing_index_name(object_type)

    # Clear away temp alias so we can reuse it, and create mappings
    clear_and_create_index(index_name=new_backing_index, object_type=object_type)
    temp_alias = get_reindexing_alias_name(object_type)
    if conn.indices.exists_alias(name=temp_alias):
        # Deletes both alias and backing indexes
        indices = conn.indices.get_alias(temp_alias).keys()
        for index in indices:
            conn.indices.delete_alias(index=index, name=temp_alias)

    # Point temp_alias toward new backing index
    conn.indices.put_alias(index=new_backing_index, name=temp_alias)

    return new_backing_index


def switch_indices(backing_index, object_type):
    """
    Switch the default index to point to the backing index, and delete the reindex alias

    Args:
        backing_index (str): The backing index of the reindex alias
        object_type (str): The object type for the index (post, comment, etc)
    """
    conn = get_conn()
    actions = []
    old_backing_indexes = []
    default_alias = get_default_alias_name(object_type)
    global_alias = get_default_alias_name(ALIAS_ALL_INDICES)
    if conn.indices.exists_alias(name=default_alias):
        # Should only be one backing index in normal circumstances
        old_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
        for index in old_backing_indexes:
            actions.extend(
                [
                    {"remove": {"index": index, "alias": default_alias}},
                    {"remove": {"index": index, "alias": global_alias}},
                ]
            )
    actions.extend(
        [
            {"add": {"index": backing_index, "alias": default_alias}},
            {"add": {"index": backing_index, "alias": global_alias}},
        ]
    )
    conn.indices.update_aliases({"actions": actions})
    refresh_index(backing_index)
    for index in old_backing_indexes:
        conn.indices.delete(index)

    # Finally, remove the link to the reindexing alias
    conn.indices.delete_alias(
        name=get_reindexing_alias_name(object_type), index=backing_index
    )


def es_iterate_all_documents(index, query, pagesize=250):
    """
    Helper to iterate all values from an index

    index (str): The index
    query (dict): Elasticsearch query filter
    pagesize (int): integer

    """
    conn = get_conn()

    offset = 0
    while True:
        result = conn.search(
            index=index, body={"query": query, "size": pagesize, "from": offset}
        )
        hits = result["hits"]["hits"]
        if not hits:
            break

        yield from (hit for hit in hits)
        offset += pagesize
