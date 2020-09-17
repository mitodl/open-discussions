"""Utility functions for ETL processes"""
import json
import re
from datetime import datetime
from functools import wraps
import logging
import uuid

import rapidjson

import pytz
import requests
from django.conf import settings
from tika import parser as tika_parser

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
        def _log_exceptions_wrapper(*args, **kwargs):
            """
            Log the exception and return the exc_return_value

            Returns:
                Any: the exc_return_value
            """
            try:
                return func(*args, **kwargs)
            except:  # pylint: disable=bare-except
                log.exception(msg)
                return exc_return_value

        return _log_exceptions_wrapper

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


def extract_text_metadata(data, *, other_headers=None):
    """
    Use tika to extract text content from file data

    Args:
        data (str): File contents
        other_headers (dict): Optional other headers to send to tika

    Returns:
         dict: metadata returned by tika, including content

    """
    if not data:
        return None

    headers = {**other_headers} if other_headers else {}
    if settings.TIKA_ACCESS_TOKEN:
        headers["X-Access-Token"] = settings.TIKA_ACCESS_TOKEN
    request_options = {"headers": headers} if headers else {}

    return tika_parser.from_buffer(data, requestOptions=request_options)


def extract_text_from_url(url, *, mime_type=None):
    """Retrieve data from a URL and parse it with tika"""
    response = requests.get(url)
    response.raise_for_status()
    if response.content:
        return extract_text_metadata(
            response.content,
            other_headers={"Content-Type": mime_type} if mime_type else {},
        )
    return None


def generate_unique_id(text):
    """
    Generate a unique UUID based on a string

    Args:
        text(str): The string to base the uuid on

    Returns:
        str: The UUID in hex string format

    """
    return uuid.uuid3(uuid.NAMESPACE_URL, text).hex


def strip_extra_whitespace(text):
    """
    Remove extra whitespace from text

    Args:
        text: string to strip extra whitespace from

    Returns:
        str: text without extra whitespace

    """
    return re.sub(r"[\s]{2,}", " ", text).strip()


def parse_dates(date_string, hour=12):
    """
    Extract a pair of dates from a string

    Args:
        date_string(str): A string containing start and end dates
        hour(int): Default hour of the day

    Returns:
        tuple of datetime: Start and end datetimes
    """
    # Start and end dates in same month (Jun 18-19, 2020)
    pattern_1_month = re.compile(
        r"(?P<start_m>\w+)\s+(?P<start_d>\d+)\s*-\s*(?P<end_d>\d+)?,\s*(?P<year>\d{4})$"
    )
    # Start and end dates in different months, same year (Jun 18 - Jul 18, 2020)
    pattern_1_year = re.compile(
        r"(?P<start_m>\w+)\s+(?P<start_d>\d+)\s*\-\s*(?P<end_m>\w+)\s+(?P<end_d>\d+),\s*(?P<year>\d{4})$"
    )
    # Start and end dates in different years (Dec 21, 2020-Jan 10,2021)
    pattern_2_years = re.compile(
        r"(?P<start_m>\w+)\s+(?P<start_d>\d+),\s*(?P<start_y>\d{4})\s*-\s*(?P<end_m>\w+)\s+(?P<end_d>\d+),\s*(?P<end_y>\d{4})$"
    )

    match = re.match(pattern_1_month, date_string)
    if match:
        start_date = datetime.strptime(
            f"{match.group('start_m')} {match.group('start_d')} {match.group('year')}",
            "%b %d %Y",
        ).replace(hour=hour, tzinfo=pytz.utc)
        end_date = datetime.strptime(
            f"{match.group('start_m')} {match.group('end_d')} {match.group('year')}",
            "%b %d %Y",
        ).replace(hour=hour, tzinfo=pytz.utc)
        return start_date, end_date
    match = re.match(pattern_1_year, date_string)
    if match:
        start_date = datetime.strptime(
            f"{match.group('start_m')} {match.group('start_d')} {match.group('year')}",
            "%b %d %Y",
        ).replace(hour=hour, tzinfo=pytz.utc)
        end_date = datetime.strptime(
            f"{match.group('end_m')} {match.group('end_d')} {match.group('year')}",
            "%b %d %Y",
        ).replace(hour=hour, tzinfo=pytz.utc)
        return start_date, end_date
    match = re.match(pattern_2_years, date_string)
    if match:
        start_date = datetime.strptime(
            f"{match.group('start_m')} {match.group('start_d')} {match.group('start_y')}",
            "%b %d %Y",
        ).replace(hour=hour, tzinfo=pytz.utc)
        end_date = datetime.strptime(
            f"{match.group('end_m')} {match.group('end_d')} {match.group('end_y')}",
            "%b %d %Y",
        ).replace(hour=hour, tzinfo=pytz.utc)
        return start_date, end_date


def map_topics(raw_topics, mapping):
    """
    Return a list of EdX topics corresponding to the list of raw topics

    Args:
        raw_topics(list of str): List of raw topics
        mapping(dict): Dictionary of raw topics to EdX topics

    Returns:
        list of str: EdX topics
    """
    topics = set()
    for raw_topic in raw_topics:
        try:
            for topic in mapping[strip_extra_whitespace(raw_topic)]:
                topics.add(topic)
        except KeyError:
            log.exception(
                "No topic mapping found for %s in %s", raw_topic, json.dumps(mapping)
            )
            continue
    return sorted(topics)
