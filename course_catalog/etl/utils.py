"""Utility functions for ETL processes"""
import csv
import glob
import json
import logging
import mimetypes
import os
import re
import uuid
from datetime import datetime
from functools import wraps
from itertools import chain
from subprocess import check_call
from tempfile import TemporaryDirectory
from typing import Generator

import boto3
import pytz
import rapidjson
import requests
from boto.s3.bucket import Bucket
from django.conf import settings
from django.utils.functional import SimpleLazyObject
from tika import parser as tika_parser
from xbundle import XBundle

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VERTICAL,
    OCW_DEPARTMENTS,
    VALID_TEXT_FILE_TYPES,
    PlatformType,
)
from course_catalog.models import get_max_length

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
    """
    Retrieve data from a URL and parse it with tika

    Args:
        url(str): The URL to retrieve content from
        mime_type(str): The expected mime-type of the content

    Returns:
        str: The text contained in the URL content.
    """
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


def _infinite_counter():
    """Infinite counter"""
    count = 0
    while True:
        yield count
        count += 1


def _get_text_from_element(element, content):
    """
    Helper method to recurse through XML elements

    Args:
        element (Element): An XML element
        content (list): A list of strings, to be modified with any new material
    """
    if element.tag not in ("style", "script"):
        if element.text:
            content.append(element.text)

        for child in element.getchildren():
            _get_text_from_element(child, content)

        if element.tail:
            content.append(element.tail)


def get_text_from_element(element):
    """
    Get relevant text for ingestion from XML element

    Args:
        element (Element): A XML element representing a vertical
    """
    content = []
    _get_text_from_element(element, content)
    return " ".join(content)


def get_xbundle_docs(olx_path: str) -> Generator[dict, None, None]:
    """
    Get vertical documents from an edx tar archive

    Args:
        olx_path(str): path to extracted edx tar archive

    Yields:
        tuple: A list of (bytes of content, metadata)
    """
    bundle = XBundle()
    bundle.import_from_directory(olx_path)
    for index, vertical in enumerate(bundle.course.findall(".//vertical")):
        content = get_text_from_element(vertical)
        yield (
            content,
            {
                "key": f"vertical_{index + 1}",
                "content_type": CONTENT_TYPE_VERTICAL,
                "title": vertical.attrib.get("display_name") or "",
                "mime_type": "application/xml",
            },
        )


def documents_from_olx(
    olx_path: str,
) -> Generator[tuple, None, None]:  # pylint: disable=too-many-locals
    """
    Extract text from OLX directory

    Args:
        olx_path (str): The path to the directory with the OLX data

    Yields:
        tuple: A list of (bytes of content, metadata)
    """
    try:
        for vertical in get_xbundle_docs(olx_path):
            yield vertical
    except Exception as err:
        log.exception("Could not read verticals from path %s", olx_path)

    counter = _infinite_counter()

    for root, _, files in os.walk(olx_path):
        for filename in files:
            _, extension = os.path.splitext(filename)
            extension_lower = extension.lower()
            if extension_lower in VALID_TEXT_FILE_TYPES:
                with open(os.path.join(root, filename), "rb") as f:
                    filebytes = f.read()

                mimetype = mimetypes.types_map.get(extension_lower)

                yield (
                    filebytes,
                    {
                        "key": f"document_{next(counter)}_{filename}",
                        "content_type": CONTENT_TYPE_FILE,
                        "mime_type": mimetype,
                    },
                )


def transform_content_files(course_tarpath: str) -> Generator[dict, None, None]:
    """
    Pass content to tika, then return a JSON document with the transformed content inside it

    Args:
        course_tarpath (str): The path to the tarball which contains the OLX

    Yields:
        dict: content from file
    """
    basedir = os.path.basename(course_tarpath).split(".")[0]
    with TemporaryDirectory(prefix=basedir) as inner_tempdir:
        check_call(["tar", "xf", course_tarpath], cwd=inner_tempdir)
        olx_path = glob.glob(inner_tempdir + "/*")[0]
        for document, metadata in documents_from_olx(olx_path):
            key = metadata["key"]
            content_type = metadata["content_type"]
            mime_type = metadata.get("mime_type")
            tika_output = extract_text_metadata(
                document, other_headers={"Content-Type": mime_type} if mime_type else {}
            )

            if tika_output is None:
                log.info("No tika response for %s", key)
                continue

            tika_content = tika_output.get("content") or ""
            tika_metadata = tika_output.get("metadata") or {}
            yield (
                {
                    "content": tika_content.strip(),
                    "published": True,
                    "key": key,
                    "published": True,
                    "content_title": (
                        metadata.get("title") or tika_metadata.get("title") or ""
                    )[: get_max_length("content_title")],
                    "content_author": (tika_metadata.get("Author") or "")[
                        : get_max_length("content_author")
                    ],
                    "content_language": (tika_metadata.get("language") or "")[
                        : get_max_length("content_language")
                    ],
                    "content_type": content_type,
                }
            )


def get_learning_course_bucket_name(platform: str) -> str:
    """
    Get the name of the platform's edx content bucket

    Args:
        platform(str): The edx platform

    Returns:
        str: The name of the edx archive bucket for the platform
    """
    bucket_names = {
        PlatformType.mitx.value: settings.EDX_LEARNING_COURSE_BUCKET_NAME,
        PlatformType.xpro.value: settings.XPRO_LEARNING_COURSE_BUCKET_NAME,
        PlatformType.mitxonline.value: settings.MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME,
    }
    return bucket_names.get(platform)


def get_learning_course_bucket(platform: str) -> Bucket:
    """
    Get the platform's learning course S3 Bucket holding content file data

    Args:
        platform(str): The platform value

    Returns:
        boto3.Bucket: the OCW S3 Bucket or None
    """
    bucket_name = get_learning_course_bucket_name(platform)
    if bucket_name:
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        return s3.Bucket(bucket_name)


def _load_ucc_topic_mappings():
    """
    Loads the topic mappings from the crosswalk CSV file

    Returns:
        dict:
            the mapping dictionary
    """
    with open("course_catalog/data/ucc-topic-mappings.csv", "r") as mapping_file:
        rows = list(csv.reader(mapping_file))
        # drop the column headers (first row)
        rows = rows[1:]
        mapping = dict()
        for row in rows:
            ocw_topics = list(filter(lambda item: item, row[2:]))
            mapping[f"{row[0]}:{row[1]}"] = ocw_topics
            mapping[row[1]] = ocw_topics
        return mapping


UCC_TOPIC_MAPPINGS = SimpleLazyObject(_load_ucc_topic_mappings)


def transform_topics(topics):
    """
    Transform topics by using our crosswalk mapping

    Args:
        topics (list of dict):
            the topics to transform

    Return:
        list of dict: the transformed topics
    """
    return [
        {"name": topic_name}
        for topic_name in chain.from_iterable(
            [
                UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                for topic in topics
                if topic is not None
            ]
        )
    ]


def extract_valid_department_from_id(course_string):
    """
    Extracts a department from course data and returns

    Args:
        course_string (str): course name as string

    Returns:
        department (str): parsed department string
    """
    department_string = re.search("\+([^\.]*)\.", course_string)
    if department_string:
        dept_candidate = department_string.groups()[0]
        return [dept_candidate] if dept_candidate in OCW_DEPARTMENTS.keys() else None
    return None
