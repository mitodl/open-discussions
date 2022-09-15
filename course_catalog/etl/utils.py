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
from subprocess import CalledProcessError, check_call
from tempfile import TemporaryDirectory

import boto3
import pytz
import rapidjson
import requests
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.utils.functional import SimpleLazyObject
from tika import parser as tika_parser
from xbundle import XBundle

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VERTICAL,
    VALID_TEXT_FILE_TYPES,
)
from course_catalog.etl.loaders import load_content_files
from course_catalog.models import Course, LearningResourceRun, get_max_length
from course_catalog.utils import get_s3_object_and_read

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


def documents_from_olx(olx_path):  # pylint: disable=too-many-locals
    """
    Extract text from OLX directory

    Args:
        olx_path (str): The path to the directory with the OLX data

    Returns:
        list of tuple:
            A list of (bytes of content, metadata)
    """
    documents = []
    bundle = XBundle()
    bundle.import_from_directory(olx_path)
    for index, vertical in enumerate(bundle.course.findall(".//vertical")):
        content = get_text_from_element(vertical)

        documents.append(
            (
                content,
                {
                    "key": f"vertical_{index + 1}",
                    "content_type": CONTENT_TYPE_VERTICAL,
                    "title": vertical.attrib.get("display_name") or "",
                    "mime_type": "application/xml",
                },
            )
        )

    counter = _infinite_counter()

    for root, _, files in os.walk(olx_path):
        for filename in files:
            _, extension = os.path.splitext(filename)
            extension_lower = extension.lower()
            if extension_lower in VALID_TEXT_FILE_TYPES:
                with open(os.path.join(root, filename), "rb") as f:
                    filebytes = f.read()

                mimetype = mimetypes.types_map.get(extension_lower)

                documents.append(
                    (
                        filebytes,
                        {
                            "key": f"document_{next(counter)}_{filename}",
                            "content_type": CONTENT_TYPE_FILE,
                            "mime_type": mimetype,
                        },
                    )
                )

    return documents


def transform_content_files(course_tarpath):
    """
    Pass content to tika, then return a JSON document with the transformed content inside it

    Args:
        course_tarpath (str): The path to the tarball which contains the OLX
    """
    content = []
    with TemporaryDirectory() as inner_tempdir:
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
            content.append(
                {
                    "content": tika_content.strip(),
                    "key": key,
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
    return content


def get_learning_course_bucket(bucket_name):
    """
    Get the learning course S3 Bucket holding content file data

    Returns:
        boto3.Bucket: the OCW S3 Bucket or None
    """
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
        mapping = {
            f"{row[0]}:{row[1]}": list(filter(lambda item: item, row[2:]))
            for row in rows
        }
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
            [UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]]) for topic in topics]
        )
    ]


def sync_olx_course_files(bucket_name, platform, ids):
    """
    Sync all edx course run files for a list of course ids to database

    Args:
        ids(list of int): list of course ids to process
    """
    bucket = get_learning_course_bucket(bucket_name)

    try:
        course_tar_regex = r".*/courses/.*\.tar\.gz$"
        most_recent_export_date = next(
            reversed(
                sorted(
                    [
                        obj
                        for obj in bucket.objects.filter(Prefix="20")
                        if re.search(course_tar_regex, obj.key)
                    ],
                    key=lambda obj: obj.last_modified,
                )
            )
        ).key.split("/")[0]
        most_recent_course_zips = [
            obj
            for obj in bucket.objects.filter(Prefix=most_recent_export_date)
            if re.search(course_tar_regex, obj.key)
        ]
    except (StopIteration, IndexError):
        log.warning(
            "No %s exported courses found in S3 bucket %s", platform, bucket_name
        )
        return

    course_content_type = ContentType.objects.get_for_model(Course)
    for course_tarfile in most_recent_course_zips:
        matches = re.search(r"courses/(.+)\.tar\.gz$", course_tarfile.key)
        run_id = matches.group(1)
        run = LearningResourceRun.objects.filter(
            platform=platform,
            run_id=run_id,
            content_type=course_content_type,
            object_id__in=ids,
        ).first()
        if not run:
            log.info(
                "No %s courses matched course tarfile %s", platform, course_tarfile
            )
            continue
        with TemporaryDirectory() as export_tempdir, TemporaryDirectory() as tar_tempdir:
            tarbytes = get_s3_object_and_read(course_tarfile)
            course_tarpath = os.path.join(
                export_tempdir, course_tarfile.key.split("/")[-1]
            )
            with open(course_tarpath, "wb") as f:
                f.write(tarbytes)
            try:
                check_call(["tar", "xf", course_tarpath], cwd=tar_tempdir)
            except CalledProcessError:
                log.exception("Unable to untar %s", course_tarfile)
                continue
            try:
                load_content_files(run, transform_content_files(course_tarpath))
            except:  # pylint: disable=bare-except
                log.exception("Error ingesting OLX content data for %s", course_tarfile)
