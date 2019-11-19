"""
Elasticsearch connection functionality
"""
from functools import partial
import uuid

from django.conf import settings
from elasticsearch_dsl.connections import connections

from search.constants import VALID_OBJECT_TYPES

_CONN = None
# When we create the connection, check to make sure all appropriate mappings exist
_CONN_VERIFIED = False


def get_conn(*, verify=True):
    """
    Lazily create the connection.

    Args:
        verify (bool): If true, check the presence of indices and mappings

    Returns:
        elasticsearch.client.Elasticsearch: An Elasticsearch client
    """
    # pylint: disable=global-statement
    global _CONN
    global _CONN_VERIFIED

    do_verify = False
    if _CONN is None:
        http_auth = settings.ELASTICSEARCH_HTTP_AUTH
        use_ssl = http_auth is not None
        _CONN = connections.create_connection(
            hosts=[settings.ELASTICSEARCH_URL],
            http_auth=http_auth,
            use_ssl=use_ssl,
            # make sure we verify SSL certificates (off by default)
            verify_certs=use_ssl,
        )
        # Verify connection on first connect if verify=True.
        do_verify = verify

    if verify and not _CONN_VERIFIED:
        # If we have a connection but haven't verified before, do it now.
        do_verify = True

    if not do_verify:
        if not verify:
            # We only skip verification if we're reindexing or
            # deleting the index. Make sure we verify next time we connect.
            _CONN_VERIFIED = False
        return _CONN

    if len(get_active_aliases(_CONN, VALID_OBJECT_TYPES)) == 0:
        raise Exception("Unable to find any active indices to update")

    _CONN_VERIFIED = True
    return _CONN


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


def get_active_aliases(conn, object_types):
    """
    Returns aliases which exist for specified object types

    Args:
        conn(elasticsearch.client.Elasticsearch): An Elasticsearch client
        object_types(list of str): list of object types (post, comment, etc)

    Returns:
        list of str: Aliases which exist
    """
    if not object_types:
        object_types = VALID_OBJECT_TYPES
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
    get_conn().indices.refresh(index)
