"""
Elasticsearch connection functionality
"""
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

    index_to_verify = settings.ELASTICSEARCH_INDEX
    if not _CONN.indices.exists(index_to_verify):
        raise Exception("Unable to find index {index_name}".format(
            index_name=index_to_verify
        ))

    _CONN_VERIFIED = True
    return _CONN
