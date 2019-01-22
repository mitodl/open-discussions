"""
Test tasks
"""
from unittest.mock import patch, Mock

import pytest

from course_catalog.models import Course, CoursePrice, CourseInstructor, CourseTopic
from course_catalog.tasks import get_edx_data


pytestmark = pytest.mark.django_db


TEST_EDX_JSON = {
    "next": "",
    "results": [
        {
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
                                "medium": {
                                    "height": 110,
                                    "url": "profile_image",
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
            "image": {
                "src": "image_src",
                "height": None,
                "width": None,
                "description": None,
            },
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
    ],
}


def test_get_mitx_data_valid(settings):
    """
    Test that mitx sync task successfully creates database objects
    """
    with patch(
        "requests.post",
        return_value=Mock(
            json=Mock(return_value={"access_token": "fake_access_token"})
        ),
    ):
        with patch(
            "requests.get",
            return_value=Mock(status_code=200, json=Mock(return_value=TEST_EDX_JSON)),
        ):
            settings.EDX_API_URL = "fake_url"
            get_edx_data()
            assert Course.objects.count() == 1
            assert CoursePrice.objects.count() == 2
            assert CourseInstructor.objects.count() == 2
            assert CourseTopic.objects.count() == 1


def test_get_mitx_data_status_error(settings):
    """
    Test that mitx sync task properly stops when it gets an error status code
    """
    with patch(
        "requests.post",
        return_value=Mock(
            json=Mock(return_value={"access_token": "fake_access_token"})
        ),
    ):
        with patch(
            "requests.get",
            return_value=Mock(status_code=500, json=Mock(return_value=TEST_EDX_JSON)),
        ):
            settings.EDX_API_URL = "fake_url"
            get_edx_data()
            assert Course.objects.count() == 0


def test_get_mitx_data_unexpected_error(settings):
    """
    Test that mitx sync task properly stops when it gets an error status code
    """
    with patch(
        "requests.post",
        return_value=Mock(
            json=Mock(return_value={"access_token": "fake_access_token"})
        ),
    ):
        with patch(
            "requests.get",
            return_value=Mock(status_code=200, json=Mock(return_value=TEST_EDX_JSON)),
        ):
            with patch(
                "course_catalog.tasks_helpers.get_year_and_semester",
                side_effect=cause_error,
            ):
                settings.EDX_API_URL = "fake_url"
                get_edx_data()
                assert Course.objects.count() == 0


def cause_error():
    """
    Helper function created to insert exceptions into otherwise working code
    """
    raise Exception("random error")
