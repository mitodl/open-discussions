"""Utility functions for ETL processes"""
from functools import wraps
import logging

import rapidjson
from tika import parser as tika_parser
from toolz import excepts

log = logging.getLogger()


def log_exceptions(msg, *, exc_return_value=None):
    """
    Returns a decorator to log exceptions of the wrapped function

    Args:
        msg (str): message to print to log
        exc_return_value (Any): the return value if an exception occurs

    Returns:
        callable: the decorator function
    """

    def _log_exceptions(func):
        """
        Decorates a function with exception logging

        Args:
            func (callable): function to decorate

        Returns:
            callable: the wrapped function
        """

        @wraps(func)
        def _log_exceptions_wrapper(_):
            """
            Log the exception and return the exc_return_value

            Returns:
                Any: the exc_return_value
            """
            log.exception(msg)
            return exc_return_value

        return excepts(Exception, func, _log_exceptions_wrapper)

    return _log_exceptions


def sync_s3_text(bucket, key, content_meta):
    """
    Save the extracted text for a ContentFile to S3 for future use

    Args:
        bucket(s3.Bucket): the bucket to place data in
        key(str): the original key of the content file
        content_meta(dict): the content metadata returned by tika
    """
    if bucket and content_meta:
        bucket.put_object(
            Key=f"extracts/{key}.json",
            Body=rapidjson.dumps(content_meta),
            ACL="public-read",
        )


def extract_text_metadata(data):
    """
    Use tika to extract text content from file data

    Args:
        data (str): File contents

    Returns:
         dict: metadata returned by tika, including content

    """
    return tika_parser.from_buffer(data)
