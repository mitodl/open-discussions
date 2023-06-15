"""
course_catalog api functions
"""
import logging
from datetime import datetime
from urllib.parse import urljoin

import boto3
import pytz
import rapidjson
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from ocw_data_parser import OCWParser

from course_catalog.constants import (
    NON_COURSE_DIRECTORIES,
    AvailabilityType,
    OfferedBy,
    PlatformType,
)
from course_catalog.etl.loaders import load_content_files, load_offered_bys
from course_catalog.etl.ocw import (
    get_ocw_learning_course_bucket,
    transform_content_files,
)
from course_catalog.etl.ocw_next import transform_ocw_next_content_files
from course_catalog.models import Course, LearningResourceRun
from course_catalog.serializers import (
    LearningResourceRunSerializer,
    OCWNextSerializer,
    OCWSerializer,
)
from course_catalog.utils import get_course_url, get_s3_object_and_read, safe_load_json
from search.search_index_helpers import deindex_course, upsert_course

log = logging.getLogger(__name__)


def digest_ocw_course(
    master_json,
    last_modified,
    is_published,
    course_prefix="",
    keep_existing_image_src=False,
):
    """
    Takes in OCW course master json to store it in DB

    Args:
        master_json (dict): course master JSON object as an output from ocw-data-parser
        last_modified (datetime): timestamp of latest modification of all course files
        is_published (bool): Flags OCW course as published or not
        course_prefix (str): (Optional) String used to query S3 bucket for course raw JSONs
        keep_existing_image_src (boolean): (Optional) Avoid overwriting image_src if  image_src is
            blank because the backpopulate is run without uploading to s3
    """
    if "course_id" not in master_json:
        log.error("Course %s is missing 'course_id'", master_json.get("uid"))
        return

    existing_course_instance = Course.objects.filter(
        platform=PlatformType.ocw.value,
        course_id=f"{master_json.get('uid')}+{master_json.get('course_id')}",
    ).first()

    data = {
        **master_json,
        "last_modified": last_modified,
        "is_published": True,  # This will be updated after all course runs are serialized
        "course_prefix": course_prefix,
    }

    if existing_course_instance and keep_existing_image_src:
        data["image_src"] = existing_course_instance.image_src

    ocw_serializer = OCWSerializer(data=data, instance=existing_course_instance)
    if not ocw_serializer.is_valid():
        log.error(
            "Course %s is not valid: %s %s",
            master_json.get("uid"),
            ocw_serializer.errors,
            master_json.get("image_src"),
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        course = ocw_serializer.save()
        load_offered_bys(course, [{"name": OfferedBy.ocw.value}])

        # Try and get the run instance.
        courserun_instance = course.runs.filter(
            platform=PlatformType.ocw.value, run_id=master_json.get("uid")
        ).first()
        run_serializer = LearningResourceRunSerializer(
            data={
                **master_json,
                "platform": PlatformType.ocw.value,
                "key": master_json.get("uid"),
                "is_published": is_published,
                "staff": master_json.get("instructors"),
                "seats": [{"price": "0.00", "mode": "audit", "upgrade_deadline": None}],
                "content_language": master_json.get("language"),
                "short_description": master_json.get("description"),
                "level_type": master_json.get("course_level"),
                "year": master_json.get("from_year"),
                "semester": master_json.get("from_semester"),
                "availability": AvailabilityType.current.value,
                "image": {
                    "src": master_json.get("image_src"),
                    "description": master_json.get("image_description"),
                },
                "max_modified": last_modified,
                "content_type": ContentType.objects.get(model="course").id,
                "object_id": course.id,
                "url": get_course_url(
                    master_json.get("uid"), master_json, PlatformType.ocw.value
                ),
                "slug": master_json.get("short_url"),
                "raw_json": master_json,
            },
            instance=courserun_instance,
        )
        if not run_serializer.is_valid():
            log.error(
                "OCW LearningResourceRun %s is not valid: %s",
                master_json.get("uid"),
                run_serializer.errors,
            )
            return
        run = run_serializer.save()
        load_offered_bys(run, [{"name": OfferedBy.ocw.value}])
    return course, run


def digest_ocw_next_course(course_json, last_modified, uid, url_path):
    """
    Takes in OCW next course data.json to store it in DB

    Args:
        course_json (dict): course data JSON object from s3
        last_modified (datetime): timestamp of latest modification of all course files
        uid (str): Course uid
        url_path (str):String used to query S3 bucket for course data JSONs
    """

    courserun_instance = LearningResourceRun.objects.filter(
        platform=PlatformType.ocw.value, run_id=uid
    ).first()

    if courserun_instance:
        existing_course_instance = courserun_instance.content_object
    else:
        existing_course_instance = None

    data = {
        **course_json,
        "uid": uid,
        "last_modified": last_modified,
        "is_published": True,
        "course_prefix": url_path,
    }

    ocw_serializer = OCWNextSerializer(data=data, instance=existing_course_instance)
    if not ocw_serializer.is_valid():
        log.error(
            "Course %s is not valid: %s",
            course_json.get("primary_course_number"),
            ocw_serializer.errors,
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        course = ocw_serializer.save()
        load_offered_bys(course, [{"name": OfferedBy.ocw.value}])

        # Try and get the run instance.
        courserun_instance = course.runs.filter(
            platform=PlatformType.ocw.value, run_id=uid
        ).first()

        run_slug = url_path.strip("/")

        run_serializer = LearningResourceRunSerializer(
            data={
                "platform": PlatformType.ocw.value,
                "key": uid,
                "is_published": True,
                "staff": course_json.get("instructors"),
                "seats": [{"price": "0.00", "mode": "audit", "upgrade_deadline": None}],
                "short_description": course_json.get("course_description"),
                "level_type": ", ".join(course_json.get("level", [])),
                "year": course_json.get("year"),
                "semester": course_json.get("term"),
                "availability": AvailabilityType.current.value,
                "image": {
                    "src": course_json.get("image_src"),
                    "description": course_json.get("course_image_metadata", {}).get(
                        "description"
                    ),
                },
                "max_modified": last_modified,
                "content_type": ContentType.objects.get(model="course").id,
                "object_id": course.id,
                "raw_json": course_json,
                "title": course_json.get("course_title"),
                "slug": run_slug,
                "url": urljoin(settings.OCW_NEXT_BASE_URL, run_slug),
            },
            instance=courserun_instance,
        )
        if not run_serializer.is_valid():
            log.error(
                "OCW LearningResourceRun %s is not valid: %s",
                uid,
                run_serializer.errors,
            )
        run = run_serializer.save()
        load_offered_bys(run, [{"name": OfferedBy.ocw.value}])
    return course, run


def format_date(date_str):
    """
    Coverts date from 2016/02/02 20:28:06 US/Eastern to 2016-02-02 20:28:06-05:00

    Args:
        date_str (String): Datetime object as string in the following format (2016/02/02 20:28:06 US/Eastern)
    Returns:
        Datetime object if passed date is valid, otherwise None
    """
    if date_str and date_str != "None":
        date_pieces = date_str.split(" ")  # e.g. 2016/02/02 20:28:06 US/Eastern
        date_pieces[0] = date_pieces[0].replace("/", "-")
        # Discard milliseconds if exists
        date_pieces[1] = (
            date_pieces[1][:-4] if "." in date_pieces[1] else date_pieces[1]
        )
        tz = date_pieces.pop(2)
        timezone = pytz.timezone(tz) if "GMT" not in tz else pytz.timezone("Etc/" + tz)
        tz_stripped_date = datetime.strptime(" ".join(date_pieces), "%Y-%m-%d %H:%M:%S")
        tz_aware_date = timezone.localize(tz_stripped_date)
        tz_aware_date = tz_aware_date.astimezone(pytz.utc)
        return tz_aware_date
    return None


def generate_course_prefix_list(bucket, course_urls=None):
    """
    Assembles a list of OCW course prefixes from an S3 Bucket that contains all the raw jsons files

    Args:
        bucket (s3.Bucket): Instantiated S3 Bucket object
        course_urls (List[str] or None): List of site urls to return
    Returns:
        List of course prefixes
    """
    ocw_courses = set()
    log.info("Assembling list of courses...")
    for bucket_file in bucket.objects.all():
        # retrieve courses, skipping non-courses (bootcamps, department topics, etc)
        if ocw_parent_folder(bucket_file.key) not in NON_COURSE_DIRECTORIES:
            key_pieces = bucket_file.key.split("/")
            course_prefix = f'{"/".join(key_pieces[:-2])}/'
            if (
                course_prefix != "/"
                and course_prefix not in ocw_courses
                and (not course_urls or key_pieces[0:-2][-1].lower() in course_urls)
            ):
                ocw_courses.add(course_prefix)
                if course_urls and len(ocw_courses) == len(course_urls):
                    break
    log.info("Done assembling list of courses...")
    return list(ocw_courses)


def get_course_availability(course):
    """
    Gets the attribute `availability` for a course if any

    Args:
        course (Course): Course model instance

    Returns:
        str: The url for the course if any
    """
    if course.platform == PlatformType.ocw.value:
        return AvailabilityType.current.value
    elif course.platform == PlatformType.mitx.value:
        course_json = course.raw_json
        if course_json is None:
            return
        runs = course_json.get("course_runs")
        if runs is None:
            return
        # get appropriate course_run
        for run in runs:
            if run.get("key") == course.course_id:
                return run.get("availability")


def sync_ocw_course_files(ids=None):
    """
    Sync all OCW course run files for a list of course ids to database

    Args:
        ids(list of int or None): list of course ids to process, all if None
    """
    bucket = get_ocw_learning_course_bucket()
    courses = Course.objects.filter(platform="ocw").filter(published=True)
    if ids:
        courses = courses.filter(id__in=ids)
    for course in courses.iterator():
        runs = course.runs.exclude(url="").exclude(published=False)
        for run in runs.iterator():
            try:
                s3_parsed_json = rapidjson.loads(
                    bucket.Object(f"{run.slug}/{run.slug}_parsed.json")
                    .get()["Body"]
                    .read()
                )
                load_content_files(run, transform_content_files(s3_parsed_json))
            except:  # pylint: disable=bare-except
                log.exception("Error syncing files for course run %d", run.id)


# pylint: disable=too-many-locals, too-many-branches, too-many-statements
def sync_ocw_course(
    *,
    course_prefix,
    raw_data_bucket,
    force_overwrite,
    upload_to_s3,
    blocklist,
    start_timestamp=None,
    force_s3_upload=False,
):
    """
    Sync an OCW course run

    Args:
        course_prefix (str): The course prefix
        raw_data_bucket (boto3.resource): The S3 bucket containing the OCW information
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        upload_to_s3 (bool): If True, upload course media to S3
        blocklist (list of str): list of course ids that should not be published
        start_timestamp (timestamp): start timestamp of backpoplate. If the updated_on is after this the update already happened
        force_s3_upload (bool): If True, upload parsed JSON even if course imported from OCW-Next

    Returns:
        str:
            The UID, or None if the run_id is not found, or if it was found but not synced
    """
    loaded_raw_jsons_for_course = []
    last_modified_dates = []
    uid = None
    is_published = True

    if ocw_parent_folder(course_prefix) in NON_COURSE_DIRECTORIES:
        log.info("Non-course folder, skipping: %s ...", course_prefix)
        return

    log.info("Syncing: %s ...", course_prefix)
    # Collect last modified timestamps for all course files of the course
    for obj in raw_data_bucket.objects.filter(Prefix=course_prefix):
        # the "1.json" metadata file contains a course's uid
        if obj.key == course_prefix + "0/1.json":
            try:
                first_json = safe_load_json(get_s3_object_and_read(obj), obj.key)
                uid = first_json.get("_uid")
                last_published_to_production = format_date(
                    first_json.get("last_published_to_production", None)
                )
                last_unpublishing_date = format_date(
                    first_json.get("last_unpublishing_date", None)
                )
                if last_published_to_production is None or (
                    last_unpublishing_date
                    and (last_unpublishing_date > last_published_to_production)
                ):
                    is_published = False
            except:  # pylint: disable=bare-except
                log.exception("Error encountered reading 1.json for %s", course_prefix)
        # accessing last_modified from s3 object summary is fast (does not download file contents)
        last_modified_dates.append(obj.last_modified)
    if not uid:
        # skip if we're unable to fetch course's uid
        log.info("Skipping %s, no course_id", course_prefix)
        return None
    # get the latest modified timestamp of any file in the course
    last_modified = max(last_modified_dates)

    # if course run synced before, check if modified since then
    courserun_instance = LearningResourceRun.objects.filter(
        platform=PlatformType.ocw.value, run_id=uid
    ).first()

    is_ocw_next_course = (
        courserun_instance is not None
        and courserun_instance.content_object.ocw_next_course
    )

    if is_ocw_next_course and not force_s3_upload:
        log.info(
            "%s is imported into OCW Studio. Skipping sync and s3 json upload from Plone",
            course_prefix,
        )
        return None

    # Make sure that the data we are syncing is newer than what we already have
    if (  # pylint: disable=too-many-boolean-expressions
        courserun_instance
        and last_modified <= courserun_instance.last_modified
        and not force_overwrite
    ) or (
        start_timestamp
        and courserun_instance
        and start_timestamp <= courserun_instance.updated_on
    ):
        log.info("Already synced. No changes found for %s", course_prefix)
        return None

    # fetch JSON contents for each course file in memory (slow)
    log.info("Loading JSON for %s...", course_prefix)
    for obj in sorted(
        raw_data_bucket.objects.filter(Prefix=course_prefix),
        key=lambda x: int(x.key.split("/")[-1].split(".")[0]),
    ):
        loaded_raw_jsons_for_course.append(
            safe_load_json(get_s3_object_and_read(obj), obj.key)
        )

    log.info("Parsing for %s...", course_prefix)
    # pass course contents into parser
    parser = OCWParser(
        loaded_jsons=loaded_raw_jsons_for_course,
        s3_bucket_name=settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        create_vtt_files=True,
    )
    course_json = parser.get_parsed_json()
    course_json["uid"] = uid
    course_json["course_id"] = "{}.{}".format(
        course_json.get("department_number"), course_json.get("master_course_number")
    )

    if course_json["course_id"] in blocklist:
        is_published = False

    if upload_to_s3 or force_s3_upload:
        parser.setup_s3_uploading(
            settings.OCW_LEARNING_COURSE_BUCKET_NAME,
            settings.AWS_ACCESS_KEY_ID,
            settings.AWS_SECRET_ACCESS_KEY,
            # course_prefix now has trailing slash so [-2] below is the last
            # actual element and [-1] is an empty string
            course_prefix.split("/")[-2],
        )
        if is_published:
            try:
                if settings.OCW_UPLOAD_IMAGE_ONLY:
                    parser.upload_course_image()
                else:
                    parser.upload_all_media_to_s3(upload_parsed_json=True)
            except:  # pylint: disable=bare-except
                log.exception(
                    "Error encountered uploading OCW files for %s", course_prefix
                )
                raise
        else:
            parser.get_s3_base_url()
            parser.upload_parsed_json_to_s3(
                boto3.resource("s3").Bucket(settings.OCW_LEARNING_COURSE_BUCKET_NAME)
            )

    if is_ocw_next_course:
        return None

    log.info("Digesting %s...", course_prefix)

    keep_existing_image_src = not upload_to_s3

    try:
        course, run = digest_ocw_course(
            course_json,
            last_modified,
            is_published,
            course_prefix,
            keep_existing_image_src,
        )
    except TypeError:
        log.info("Course and run not returned, skipping")
        return None

    if upload_to_s3 and is_published:
        load_content_files(run, transform_content_files(course_json))

    course.published = is_published or (
        Course.objects.get(id=course.id).runs.filter(published=True).exists()
    )
    course.save()
    if course.published:
        upsert_course(course.id)
    else:
        deindex_course(course)


def sync_ocw_next_course(
    *, url_path, s3_resource, force_overwrite, start_timestamp=None
):
    """
    Sync an OCW course run

    Args:
        url_path (str): The course url path
        s3_resource (boto3.resource): Boto3 s3 resource
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        start_timestamp (timestamp): start timestamp of backpoplate. If the updated_on is after this the update already happened

    Returns:
        str:
            The UID, or None if the run_id is not found, or if it was found but not synced
    """
    course_json = {}
    uid = None

    log.info("Syncing: %s ...", url_path)

    s3_data_object = s3_resource.Object(
        settings.OCW_NEXT_LIVE_BUCKET, url_path + "data.json"
    )

    try:
        course_json = safe_load_json(
            get_s3_object_and_read(s3_data_object), s3_data_object.key
        )
        last_modified = s3_data_object.last_modified
    except:  # pylint: disable=bare-except
        log.exception("Error encountered reading data.json for %s", url_path)

    uid = course_json.get("legacy_uid")

    if not uid:
        uid = course_json.get("site_uid")

    if not uid:
        log.info("Skipping %s, both site_uid and legacy_uid missing", url_path)
        return None
    else:
        uid = uid.replace("-", "")

    # if course run synced before, check if modified since then
    courserun_instance = LearningResourceRun.objects.filter(
        platform=PlatformType.ocw.value, run_id=uid
    ).first()

    # Make sure that the data we are syncing is newer than what we already have
    if (  # pylint: disable=too-many-boolean-expressions
        courserun_instance
        and last_modified <= courserun_instance.last_modified
        and not force_overwrite
    ) or (
        start_timestamp
        and courserun_instance
        and start_timestamp <= courserun_instance.updated_on
    ):
        log.info("Already synced. No changes found for %s", url_path)
        return None

    log.info("Digesting %s...", url_path)

    try:
        course, run = digest_ocw_next_course(  # pylint: disable=unused-variable
            course_json, last_modified, uid, url_path
        )
    except TypeError:
        log.info("Course and run not returned, skipping")
        return None

    upsert_course(course.id)
    load_content_files(
        run, transform_ocw_next_content_files(s3_resource, url_path, force_overwrite)
    )


def sync_ocw_courses(
    *,
    course_prefixes,
    blocklist,
    force_overwrite,
    upload_to_s3,
    start_timestamp=None,
    force_s3_upload=False,
):
    """
    Sync OCW courses to the database

    Args:
        course_prefixes (list of str): The course prefixes to process
        blocklist (list of str): list of course ids to skip
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        upload_to_s3 (bool): If True, upload course media to S3
        start_timestamp (datetime or None): backpopulate start time
        force_s3_upload (bool): If True, upload parsed JSON even if course imported from OCW-Next
    Returns:
        set[str]: All LearningResourceRun.run_id values for course runs which were synced
    """
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)

    for course_prefix in course_prefixes:
        try:
            sync_ocw_course(
                course_prefix=course_prefix,
                raw_data_bucket=raw_data_bucket,
                force_overwrite=force_overwrite,
                upload_to_s3=upload_to_s3,
                blocklist=blocklist,
                start_timestamp=start_timestamp,
                force_s3_upload=force_s3_upload,
            )
        except:  # pylint: disable=bare-except
            log.exception("Error encountered parsing OCW json for %s", course_prefix)


def sync_ocw_next_courses(*, url_paths, force_overwrite, start_timestamp=None):
    """
    Sync OCW courses to the database

    Args:
        url_paths (list of str): The course url paths to process
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        start_timestamp (datetime or None): backpopulate start time

    Returns:
        set[str]: All LearningResourceRun.run_id values for course runs which were synced
    """
    s3_resource = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

    for url_path in url_paths:
        try:
            sync_ocw_next_course(
                url_path=url_path,
                s3_resource=s3_resource,
                force_overwrite=force_overwrite,
                start_timestamp=start_timestamp,
            )
        except:  # pylint: disable=bare-except
            log.exception("Error encountered parsing OCW json for %s", url_path)


def ocw_parent_folder(prefix):
    """
    Get the S3 parent folder of an OCW course

    Args:
        prefix(str): The course prefix

    Returns:
        str: The parent folder for the course prefix
    """
    prefix_parts = prefix.split("/")
    return "/".join(prefix_parts[0:2]) if prefix_parts[0] == "PROD" else prefix_parts[0]
