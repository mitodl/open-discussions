"""
Elasticsearch connection functionality
"""
import uuid

from django.conf import settings
from elasticsearch_dsl.connections import connections


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
            verify_certs=use_ssl
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

    if len(get_active_aliases()) == 0:
        raise Exception("Unable to find any active indices to update")

    _CONN_VERIFIED = True
    return _CONN


def make_backing_index_name():
    """
    Make a unique name for use for a backing index

    Returns:
        str: A new name for a backing index
    """
    return "{prefix}_{hash}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        hash=uuid.uuid4().hex,
    )


def make_alias_name(*, is_reindexing):
    """
    Make the name used for the Elasticsearch alias

    Args:
        is_reindexing (bool): If true, use the alias name meant for reindexing

    Returns:
        str: The name of the alias
    """
    return "{prefix}_{suffix}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        suffix='reindexing' if is_reindexing else 'default'
    )


def get_default_alias():
    """
    Return the default alias

    Returns:
        str: The default alias
    """
    return make_alias_name(is_reindexing=False)


def get_reindexing_alias():
    """
    Returns the reindexing alias

    Returns:
        str: The reindexing alias
    """
    return make_alias_name(is_reindexing=True)


def get_active_aliases():
    """
    Returns aliases which exist

    Returns:
        list of str: Aliases which exist
    """
    conn = get_conn(verify=False)
    return [
        alias for alias in [get_default_alias(), get_reindexing_alias()]
        if conn.indices.exists(alias)
    ]
