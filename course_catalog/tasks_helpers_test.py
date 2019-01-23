"""
Test course_catalog tasks_helpers
"""
import copy
from datetime import timedelta, datetime

import pytest
import pytz
from django.utils import timezone

from course_catalog.factories import CourseFactory
from course_catalog.models import Course, CourseInstructor, CoursePrice, CourseTopic
from course_catalog.tasks_helpers import (
    parse_mitx_json_data,
    digest_ocw_course,
    get_ocw_topic,
    safe_load_json,
)

pytestmark = pytest.mark.django_db


mitx_valid_data = {
    "key": "MITx+15.071x",
    "uuid": "ff1df27b-3c97-42ee-a9b3-e031ffd41a4f",
    "title": "The Analytics Edge",
    "course_runs": [
        {
            "key": "course-v1:MITx+15.071x+1T2019",
            "uuid": "f4b7be41-352f-4c0d-afc5-424dcf498ed6",
            "title": "The Analytics Edge",
            "image": {
                "src": "https://prod-discovery.edx-cdn.org/media/course/image/"
                "ff1df27b-3c97-42ee-a9b3-e031ffd41a4f-747c9c2f216e.small.jpg",
                "height": None,
                "width": None,
                "description": None,
            },
            "short_description": "short_description",
            "marketing_url": "marketing_url",
            "seats": [
                {
                    "type": "verified",
                    "price": "150.00",
                    "currency": "USD",
                    "upgrade_deadline": "2019-03-20T15:00:00Z",
                    "credit_provider": None,
                    "credit_hours": None,
                    "sku": "E110665",
                    "bulk_sku": "5B37144",
                },
                {
                    "type": "audit",
                    "price": "0.00",
                    "currency": "USD",
                    "upgrade_deadline": None,
                    "credit_provider": None,
                    "credit_hours": None,
                    "sku": "98D6AA9",
                    "bulk_sku": None,
                },
            ],
            "start": "2019-02-20T15:00:00Z",
            "end": "2019-05-22T23:30:00Z",
            "enrollment_start": None,
            "enrollment_end": None,
            "pacing_type": "instructor_paced",
            "type": "verified",
            "status": "published",
            "course": "MITx+15.071x",
            "full_description": "<p>Full Description</p>",
            "announcement": "2018-12-19T15:50:34Z",
            "video": {
                "src": "http://www.youtube.com/watch?v=1BMSOBCe07k",
                "description": None,
                "image": {
                    "src": "image_source",
                    "description": None,
                    "height": None,
                    "width": None,
                },
            },
            "content_language": "en-us",
            "license": "",
            "outcome": "outcome",
            "transcript_languages": ["en-us"],
            "instructors": [],
            "staff": [
                {
                    "uuid": "32720429-8290-4ac5-a62d-386fb3c4be80",
                    "salutation": None,
                    "given_name": "Dimitris",
                    "family_name": "Bertsimas",
                    "bio": "Dimitris Bertsimas bio",
                    "slug": "dimitris-bertsimas",
                    "position": {
                        "title": "Boeing Professor of Operations Research ",
                        "organization_name": "MIT",
                        "organization_id": 27,
                        "organization_override": "MIT",
                        "organization_marketing_url": "https://www.edx.org/school/mitx",
                    },
                    "areas_of_expertise": [],
                    "profile_image": {
                        "medium": {"height": 110, "url": "profile_image", "width": 110}
                    },
                    "works": [],
                    "urls": {"facebook": None, "blog": None, "twitter": None},
                    "urls_detailed": [],
                    "email": None,
                    "profile_image_url": "profile_image_url",
                    "major_works": "",
                    "published": True,
                },
                {
                    "uuid": "5bb098d8-76fb-450b-9e59-3a60b041f645",
                    "salutation": None,
                    "given_name": "Allison",
                    "family_name": "O'Hair",
                    "bio": "bio",
                    "slug": "allison-ohair",
                    "position": {
                        "title": "Lecturer",
                        "organization_name": "Stanford University",
                        "organization_id": None,
                        "organization_override": "Stanford University",
                        "organization_marketing_url": None,
                    },
                    "areas_of_expertise": [],
                    "profile_image": {
                        "medium": {
                            "height": 110,
                            "url": "profile_image_url",
                            "width": 110,
                        }
                    },
                    "works": [],
                    "urls": {"facebook": None, "blog": None, "twitter": None},
                    "urls_detailed": [],
                    "email": None,
                    "profile_image_url": "profile_image_url",
                    "major_works": "",
                    "published": True,
                },
            ],
            "min_effort": 10,
            "max_effort": 15,
            "weeks_to_complete": 13,
            "modified": "2019-01-11T18:27:16.466621Z",
            "level_type": "Intermediate",
            "availability": "Starting Soon",
            "mobile_available": True,
            "hidden": False,
            "reporting_type": "mooc",
            "eligible_for_financial_aid": True,
            "first_enrollable_paid_seat_price": 150,
            "has_ofac_restrictions": False,
            "enrollment_count": 1619,
            "recent_enrollment_count": 1619,
        }
    ],
    "entitlements": [],
    "owners": [
        {
            "uuid": "2a73d2ce-c34a-4e08-8223-83bca9d2f01d",
            "key": "MITx",
            "name": "Massachusetts Institute of Technology",
            "certificate_logo_image_url": "https://edxuploads.s3.amazonaws.com/organization_logos/logo-mitx.png",
            "description": "description",
            "homepage_url": "",
            "tags": ["charter", "founder"],
            "logo_image_url": "logo_image_url",
            "marketing_url": "https://www.edx.org/school/mitx",
        }
    ],
    "image": {"src": "image_src", "height": None, "width": None, "description": None},
    "short_description": "short_description",
    "full_description": "full description",
    "level_type": "Intermediate",
    "subjects": [
        {
            "name": "Data Analysis & Statistics",
            "subtitle": "subtitle",
            "description": "description",
            "banner_image_url": "banner_image_url",
            "card_image_url": "https://www.edx.org/sites/default/files/subject/image/card/data-science.jpg",
            "slug": "data-analysis-statistics",
            "uuid": "a168a80a-4b6c-4d92-9f1d-4c235206feaf",
        }
    ],
    "prerequisites": [],
    "prerequisites_raw": "prerequisites_raw",
    "expected_learning_items": [],
    "video": {
        "src": "http://www.youtube.com/watch?v=1BMSOBCe07k",
        "description": None,
        "image": {
            "src": "video_image_src",
            "description": None,
            "height": None,
            "width": None,
        },
    },
    "sponsors": [],
    "modified": "2019-01-11T18:07:29.593570Z",
    "marketing_url": "marketing_url",
    "syllabus_raw": "",
    "outcome": "outcome",
    "original_image": {
        "src": "original_image_src",
        "height": None,
        "width": None,
        "description": None,
    },
    "card_image_url": "card_image_url",
    "canonical_course_run_key": "MITx/15.071x/1T2014",
    "extra_description": None,
    "additional_information": "",
    "faq": "faq",
    "learner_testimonials": "",
    "enrollment_count": 90600,
    "recent_enrollment_count": 14365,
    "topics": [],
}


@pytest.mark.parametrize("force_overwrite", [True, False])
def test_parse_mitx_json_data_overwrite(mocker, force_overwrite):
    """
    Test that valid mitx json data is skipped if it doesn't need an update
    """
    CourseFactory.create(
        course_id=mitx_valid_data["course_runs"][0]["key"],
        last_modified=datetime.now().astimezone(pytz.utc),
    )
    mock_logger = mocker.patch("course_catalog.tasks_helpers.log.debug")
    parse_mitx_json_data(mitx_valid_data, force_overwrite=force_overwrite)
    assert mock_logger.call_count == (0 if force_overwrite else 1)


def test_parse_valid_mitx_json_data():
    """
    Test parsing valid mitx json data
    """
    parse_mitx_json_data(mitx_valid_data)
    courses_count = Course.objects.count()
    assert courses_count == 1

    course_instructors_count = CourseInstructor.objects.count()
    assert course_instructors_count == 2

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 2

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == 1


def test_parse_invalid_mitx_json_data():
    """
    Test parsing invalid mitx json data
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["course_runs"][0]["key"] = ""
    parse_mitx_json_data(invalid_data)
    courses_count = Course.objects.count()
    assert courses_count == 0


def test_parse_wrong_owner_json_data():
    """
    Test parsing valid edx data from a different owner.
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["owners"][0]["key"] = "FakeUniversity"
    parse_mitx_json_data(invalid_data)
    courses_count = Course.objects.count()
    assert courses_count == 0


def test_deserializing_a_valid_ocw_course():
    """
    Verify that OCWSerializer successfully de-serialize a JSON object and create Course model instance
    """
    valid_ocw_obj = {
        "uid": "e9387c256bae4ca99cce88fd8b7f8272",
        "title": "Undergraduate Thesis Tutorial",
        "description": "<p>This course is a series of lectures on prospectus and thesis writing</p>",
        "course_level": "Undergraduate",
        "from_semester": "Fall",
        "from_year": "2015",
        "language": "en-US",
        "image_src": "https://s3.us-east-2.amazonaws.com/alizagarantestbucket/test_folder/"
        "f49d46243a5c035597e75941ffec830a_22-thtf15.jpg",
        "image_description": "Photo of hardbound academic theses on library shelves.",
        "platform": "OCW",
        "creation_date": "2016-01-08 22:35:55.151996+00:00",
        "expiration_date": None,
        "raw_json": {"name": "ali", "whatever": "something", "llist": [1, 2, 3]},
        "instructors": [
            {
                "middle_initial": "",
                "first_name": "Michael",
                "last_name": "Short",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "d9ca5631c6936252866d63683c0c452e",
            },
            {
                "middle_initial": "",
                "first_name": "Jane",
                "last_name": "Kokernak",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "bb1e26b5f5c9c054ddae8a2988ad7b42",
            },
            {
                "middle_initial": "",
                "first_name": "Christine",
                "last_name": "Sherratt",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "a39f692061a70a105c25b15374c02c92",
            },
        ],
        "course_collections": [
            {
                "ocw_subfeature": "Nuclear Engineering",
                "ocw_feature_url": "",
                "ocw_speciality": "Health and Exercise Science",
                "ocw_feature_notes": "",
            },
            {
                "ocw_feature": "Humanities",
                "ocw_subfeature": "Literature",
                "ocw_feature_url": "",
                "ocw_speciality": "Academic Writing",
                "ocw_feature_notes": "",
            },
        ],
        "price": {"price": 0.0, "mode": "audit", "upgrade_deadline": None},
    }
    digest_ocw_course(valid_ocw_obj, timezone.now(), None)
    assert Course.objects.count() == 1
    digest_ocw_course(valid_ocw_obj, timezone.now() - timedelta(hours=1), None)
    assert Course.objects.count() == 1

    course_instructors_count = CourseInstructor.objects.count()
    assert course_instructors_count == len(valid_ocw_obj.get("instructors"))

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 1

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == sum(
        len(get_ocw_topic(cc)) for cc in valid_ocw_obj.get("course_collections")
    )


def test_deserialzing_an_invalid_ocw_course():
    """
    Verifies that OCWSerializer validation works correctly if the OCW course has invalid values
    """
    invalid_ocw_obj = {
        "uid": "",
        "title": "",
        "description": "",
        "course_level": "",
        "from_semester": "Fall",
        "from_year": "2015",
        "language": "en-US",
        "image_src": "",
        "image_description": "Photo of hardbound academic theses on library shelves.",
        "platform": "OCW",
        "creation_date": "2016/01/08 22:35:55.151996+00:00",
        "expiration_date": None,
        "raw_json": {},
        "instructors": [
            {
                "middle_initial": "",
                "first_name": "Michael",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "d9ca5631c6936252866d63683c0c453e",
            },
            {
                "middle_initial": "",
                "first_name": "Jane",
                "last_name": "Kokernak",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "bb1e26b5f5c9c054ddae8a2988ad7b48",
            },
            {
                "middle_initial": "",
                "last_name": "Sherratt",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "a39f692061a70a105c25b15374c02c95",
            },
        ],
        "course_collections": [
            {
                "ocw_feature": "Engineering",
                "ocw_subfeature": "Nuclear Engineering",
                "ocw_feature_url": "",
                "ocw_speciality": "",
                "ocw_feature_notes": "",
            },
            {
                "ocw_feature": "Humanities",
                "ocw_subfeature": "Literature",
                "ocw_feature_url": "",
                "ocw_speciality": "Academic Writing",
                "ocw_feature_notes": "",
            },
        ],
        "price": {"price": 0.0, "upgrade_deadline": None},
    }
    digest_ocw_course(invalid_ocw_obj, timezone.now(), None)
    assert not Course.objects.count()


def test_safe_load_bad_json(mocker):
    """ Test that safe_load_json returns an empty dict for invalid JSON"""
    mock_logger = mocker.patch("course_catalog.tasks_helpers.log.exception")
    assert safe_load_json("badjson", "key") == {}
    mock_logger.assert_called_with("%s has a corrupted JSON", "key")
