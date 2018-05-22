"""open_discussions utilities"""
import datetime
from enum import (
    auto,
    Enum,
    Flag,
)
from itertools import islice
import logging

import pytz
from django.conf import settings


log = logging.getLogger(__name__)


class FeatureFlag(Flag):
    """
    FeatureFlag enum

    Members should have values of increasing powers of 2 (1, 2, 4, 8, ...)

    """
    EXAMPLE_FEATURE = auto()


def webpack_dev_server_host(request):
    """
    Get the correct webpack dev server host
    """
    return settings.WEBPACK_DEV_SERVER_HOST or request.get_host().split(":")[0]


def webpack_dev_server_url(request):
    """
    Get the full URL where the webpack dev server should be running
    """
    return 'http://{}:{}'.format(webpack_dev_server_host(request), settings.WEBPACK_DEV_SERVER_PORT)


def is_near_now(time):
    """
    Returns true if time is within five seconds or so of now
    Args:
        time (datetime.datetime):
            The time to test
    Returns:
        bool:
            True if near now, false otherwise
    """
    now = datetime.datetime.now(tz=pytz.UTC)
    five_seconds = datetime.timedelta(0, 5)
    return now - five_seconds < time < now + five_seconds


def now_in_utc():
    """
    Get the current time in UTC
    Returns:
        datetime.datetime: A datetime object for the current time
    """
    return datetime.datetime.now(tz=pytz.UTC)


def normalize_to_start_of_day(dt):
    """
    Normalizes a datetime value to the start of it's day

    Args:
        dt (datetime.datetime): the datetime to normalize

    Returns:
        datetime.datetime: the normalized datetime
    """
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def chunks(iterable, chunk_size=20):
    """
    Yields chunks of an iterable as sub lists each of max size chunk_size.

    Args:
        iterable (iterable): iterable of elements to chunk
        chunk_size (int): Max size of each sublist

    Yields:
        list: List containing a slice of list_to_chunk
    """
    chunk_size = max(1, chunk_size)
    iterable = iter(iterable)
    chunk = list(islice(iterable, chunk_size))

    while len(chunk) > 0:
        yield chunk
        chunk = list(islice(iterable, chunk_size))


def merge_strings(list_or_str):
    """
    Recursively go through through nested lists of strings and merge into a flattened list.

    Args:
        list_or_str (any): A list of strings or a string

    Returns:
        list of str: A list of strings
    """

    list_to_return = []
    _merge_strings(list_or_str, list_to_return)
    return list_to_return


def _merge_strings(list_or_str, list_to_return):
    """
    Recursively go through through nested lists of strings and merge into a flattened list.

    Args:
        list_or_str (any): A list of strings or a string
        list_to_return (list of str): The list the strings will be added to
    """
    if isinstance(list_or_str, list):
        for item in list_or_str:
            _merge_strings(item, list_to_return)
    elif list_or_str is not None:
        list_to_return.append(list_or_str)


class AutoName(Enum):
    """"Generates enum values using the name"""
    def _generate_next_value_(self, name, *args):  # pylint: disable=unused-argument
        """"Generates enum values using the name"""
        return name
