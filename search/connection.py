"""
Elasticsearch connection functionality
"""
import uuid
from functools import partial

from django.conf import settings
from elasticsearch_dsl.connections import connections

from search.constants import VALID_OBJECT_TYPES


def configure_connections():
    """
    Create connections for the application

    This should only be called once
    """
    # this is the default connection
    http_auth = settings.ELASTICSEARCH_HTTP_AUTH
    use_ssl = http_auth is not None
    # configure() lazily creates connections when get_connection() is called
    connections.configure(
        default={
            "hosts": [settings.ELASTICSEARCH_URL],
            "http_auth": http_auth,
            "use_ssl": use_ssl,
            "connections_per_node": settings.ELASTICSEARCH_CONNECTIONS_PER_NODE,
            # make sure we verify SSL certificates (off by default)
            "verify_certs": use_ssl,
        }
    )


def get_conn():
    """
    Get the default connection

    Returns:
        elasticsearch.client.Elasticsearch: An Elasticsearch client
    """
    return connections.get_connection()


def make_backing_index_name(object_type):
    """
    Make a unique name for use for a backing index

    Args:
        object_type(str): The object type (post, comment, profile)

    Returns:
        str: A new name for a backing index
    """
    return "{prefix}_{object_type}_{hash}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        object_type=object_type,
        hash=uuid.uuid4().hex,
    )


def make_alias_name(is_reindexing, object_type):
    """
    Make the name used for the Elasticsearch alias

    Args:
        object_type(str): The object type of the index (post, comment, etc)
        is_reindexing (bool): If true, use the alias name meant for reindexing

    Returns:
        str: The name of the alias
    """
    return "{prefix}_{object_type}_{suffix}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        object_type=object_type,
        suffix="reindexing" if is_reindexing else "default",
    )


get_default_alias_name = partial(make_alias_name, False)
get_reindexing_alias_name = partial(make_alias_name, True)


def get_active_aliases(conn, *, object_types=None, include_reindexing=True):
    """
    Returns aliases which exist for specified object types

    Args:
        conn(elasticsearch.client.Elasticsearch): An Elasticsearch client
        object_types(list of str): list of object types (post, comment, etc)
        include_reindexing(boolean): include reindexing indexes if true

    Returns:
        list of str: Aliases which exist
    """
    if not object_types:
        object_types = VALID_OBJECT_TYPES
    if include_reindexing:
        return active_aliases_with_reindexing(conn, object_types)
    else:
        return [
            alias
            for alias in [get_default_alias_name(obj) for obj in object_types]
            if conn.indices.exists(alias)
        ]


def active_aliases_with_reindexing(conn, object_types):
    """
    Returns aliases which exist for specified object types including reindexing aliases

    Args:
        conn(elasticsearch.client.Elasticsearch): An Elasticsearch client
        object_types(list of str): list of object types (post, comment, etc)
    """

    return [
        alias
        for alias_tuple in [
            (get_default_alias_name(obj), get_reindexing_alias_name(obj))
            for obj in object_types
        ]
        for alias in alias_tuple
        if conn.indices.exists(alias)
    ]


def refresh_index(index):
    """
    Refresh the elasticsearch index

    Args:
        index (str): The elasticsearch index to refresh
    """
    conn = get_conn()
    conn.indices.refresh(index)
