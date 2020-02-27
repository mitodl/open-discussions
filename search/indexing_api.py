"""
Functions and constants for Elasticsearch indexing
"""
import logging

from elasticsearch.helpers import bulk
from elasticsearch.exceptions import ConflictError, NotFoundError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from course_catalog.models import Course, ContentFile, LearningResourceRun
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
    POST_TYPE,
    COMMENT_TYPE,
    PROFILE_TYPE,
    COURSE_TYPE,
    ALIAS_ALL_INDICES,
    VALID_OBJECT_TYPES,
    GLOBAL_DOC_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
    VIDEO_TYPE,
)
from search.exceptions import ReindexException
from search.serializers import (
    serialize_bulk_posts,
    serialize_bulk_comments,
    serialize_bulk_profiles,
    serialize_bulk_courses,
    ESPostSerializer,
    serialize_bulk_bootcamps,
    serialize_bulk_programs,
    serialize_bulk_user_lists,
    serialize_bulk_videos,
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
            "raw": {"type": "keyword"},
        },
    },
    "author_avatar_small": {"type": "keyword"},
    "author_headline": ENGLISH_TEXT_FIELD,
}

PROFILE_OBJECT_TYPE = {
    **BASE_OBJECT_TYPE,
    "author_bio": ENGLISH_TEXT_FIELD,
    "author_channel_membership": {"type": "keyword"},
    "author_channel_join_data": {
        "type": "nested",
        "properties": {"name": {"type": "keyword"}, "joined": {"type": "date"}},
    },
    "author_avatar_medium": {"type": "keyword"},
}

CONTENT_OBJECT_TYPE = {
    **BASE_OBJECT_TYPE,
    "channel_name": {"type": "keyword"},
    "channel_title": ENGLISH_TEXT_FIELD,
    "channel_type": {"type": "keyword"},
    "text": ENGLISH_TEXT_FIELD,
    "score": {"type": "long"},
    "post_id": {"type": "keyword"},
    "post_title": ENGLISH_TEXT_FIELD,
    "post_slug": {"type": "keyword"},
    "created": {"type": "date"},
    "deleted": {"type": "boolean"},
    "removed": {"type": "boolean"},
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
        },
    },
}

COURSE_FILE_OBJECT_TYPE = {
    "run_id": {"type": "keyword"},
    "uid": {"type": "keyword"},
    "key": {"type": "keyword"},
    "url": {"type": "keyword"},
    "file_type": {"type": "keyword"},
    "content": ENGLISH_TEXT_FIELD,
}

COURSE_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    **COURSE_FILE_OBJECT_TYPE,
    "id": {"type": "long"},
    "course_id": {"type": "keyword"},
    "full_description": ENGLISH_TEXT_FIELD,
    "platform": {"type": "keyword"},
    "published": {"type": "boolean"},
}


BOOTCAMP_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "course_id": {"type": "keyword"},
    "full_description": ENGLISH_TEXT_FIELD,
    "location": {"type": "keyword"},
    "published": {"type": "boolean"},
}

PROGRAM_OBJECT_TYPE = {**LEARNING_RESOURCE_TYPE, "id": {"type": "long"}}

USER_LIST_OBJECT_TYPE = {
    **RESOURCE_RELATIONS,
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
    BOOTCAMP_TYPE: BOOTCAMP_OBJECT_TYPE,
    PROGRAM_TYPE: PROGRAM_OBJECT_TYPE,
    USER_LIST_TYPE: USER_LIST_OBJECT_TYPE,
    LEARNING_PATH_TYPE: USER_LIST_OBJECT_TYPE,
    VIDEO_TYPE: VIDEO_OBJECT_TYPE,
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
            }
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
    for alias in get_active_aliases(conn, [data["object_type"]]):
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
    for alias in get_active_aliases(conn, [object_type]):
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
    for alias in get_active_aliases(conn, object_types):
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
    for alias in get_active_aliases(conn, [object_type]):
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


def index_items(documents, object_type, **kwargs):
    """
    Index items based on list of item ids

    Args:
        documents (iterable of dict): An iterable with ElasticSearch documents to index
        object_type (str): the ES object type
    """
    conn = get_conn()
    # bulk will also break an iterable into chunks. However we should do this here so that
    # we can use the same documents when indexing to multiple aliases.
    for chunk in chunks(
        documents, chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE
    ):
        for alias in get_active_aliases(conn, [object_type]):
            _, errors = bulk(
                conn,
                chunk,
                index=alias,
                doc_type=GLOBAL_DOC_TYPE,
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                **kwargs,
            )
            if len(errors) > 0:
                raise ReindexException(
                    f"Error during bulk {object_type} insert: {errors}"
                )


def index_posts(ids):
    """
    Index a list of posts by id

    Args:
        ids(list of int): List of Post id's
    """
    index_items(serialize_bulk_posts(ids), POST_TYPE)


def index_comments(ids):
    """
    Index a list of comments by id

    Args:
        ids(list of int): List of Comment id's
    """
    index_items(serialize_bulk_comments(ids), COMMENT_TYPE)


def index_profiles(ids):
    """
    Index a list of profiles by id

    Args:
        ids(list of int): List of Profile id's
    """
    index_items(serialize_bulk_profiles(ids), PROFILE_TYPE)


def index_courses(ids):
    """
    Index a list of courses by id

    Args:
        ids(list of int): List of Course id's
    """
    index_items(serialize_bulk_courses(ids), COURSE_TYPE)


def index_course_content_files(course_ids):
    """
    Index a list of content files by course ids

    Args:
        course_ids(list of int): List of Course id's
    """
    course_content_type = ContentType.objects.get_for_model(Course)
    for run_id in LearningResourceRun.objects.filter(
        object_id__in=course_ids, content_type=course_content_type
    ).values_list("id", flat=True):
        index_run_content_files(run_id)


def index_run_content_files(run_id):
    """
    Index a list of content files by run id

    Args:
        run_id(int): Course run id
    """
    run = LearningResourceRun.objects.get(id=run_id)
    documents = (
        serialize_content_file_for_bulk(content_file)
        for content_file in run.content_files.select_related("run")
        .prefetch_related("run__content_object")
        .defer("run__raw_json")
    )
    index_items(
        documents,
        COURSE_TYPE,
        routing=gen_course_id(
            run.content_object.platform, run.content_object.course_id
        ),
    )


def delete_run_content_files(run_id):
    """
    Delete a list of content files by run from the index

    Args:
        run_id(int): Course run id
    """
    run = LearningResourceRun.objects.get(id=run_id)
    documents = (
        serialize_content_file_for_bulk_deletion(content_file)
        for content_file in ContentFile.objects.filter(run=run)
    )
    course = run.content_object
    index_items(
        documents, COURSE_TYPE, routing=gen_course_id(course.platform, course.course_id)
    )


def index_bootcamps(ids):
    """
    Index a list of bootcamps by id

    Args:
        ids(list of int): List of Bootcamp id's
    """
    index_items(serialize_bulk_bootcamps(ids), BOOTCAMP_TYPE)


def index_programs(ids):
    """
    Index a list of programs by id

    Args:
        ids(list of int): List of Program id's
    """
    index_items(serialize_bulk_programs(ids), PROGRAM_TYPE)


def index_user_lists(ids):
    """
    Index a list of user lists by id

    Args:
        ids(list of int): List of UserList id's
    """
    index_items(serialize_bulk_user_lists(ids), USER_LIST_TYPE)


def index_videos(ids):
    """
    Index a list of videos by id

    Args:
        ids(list of int): List of Video id's
    """
    index_items(serialize_bulk_videos(ids), VIDEO_TYPE)


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
