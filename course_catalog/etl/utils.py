"""Utility functions for ETL processes"""
from functools import wraps
import logging

from tika import parser as tika_parser
from toolz import excepts

from course_catalog.constants import PlatformType
from course_catalog.etl.ocw import _get_ocw_learning_course_bucket

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


def get_bucket_for_platform(platform):
    """
    Get the correct file bucket for a platform

    Args:
        platform(str): The course run platform

    Returns:
        s3.Bucket: the platform-specific bucket for content files

    """
    if platform == PlatformType.ocw.value:
        return _get_ocw_learning_course_bucket()
    return None


def sync_s3_text(platform, key, text):
    """
    Save the extracted text for a ContentFile to S3 for future use

    Args:
        platform(str): the platform of the ContentFile
        key(str): the original key of the content file
        text(str): the text to save
    """
    bucket = get_bucket_for_platform(platform)
    if bucket and text:
        bucket.put_object(Key=f"extracts/{key}.txt", Body=text, ACL="public-read")


def extract_text(data):
    """
    Use tika to extract text content from file data

    Args:
        data (str): File contents

    Returns:
         str: text contained in file

    """
    return tika_parser.from_buffer(data).get("content", None)
