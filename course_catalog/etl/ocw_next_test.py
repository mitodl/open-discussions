"""Next OCW ETL tests"""
from datetime import datetime

import boto3
import pytest
import pytz
from moto import mock_s3

from course_catalog.conftest import OCW_NEXT_TEST_PREFIX, setup_s3_ocw_next
from course_catalog.etl.ocw_next import (
    transform_ocw_next_content_files,
    transform_resource,
)
from course_catalog.factories import ContentFileFactory
from course_catalog.models import ContentFile
from course_catalog.utils import get_s3_object_and_read, safe_load_json

pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument


@mock_s3
def test_transform_ocw_next_content_files(settings, mocker):
    """
    Test transform_ocw_next_content_files
    """

    setup_s3_ocw_next(settings)
    s3_resource = boto3.resource("s3")
    mocker.patch(
        "course_catalog.etl.ocw_next.extract_text_metadata",
        return_value={"content": "TEXT"},
    )

    content_data = list(
        transform_ocw_next_content_files(s3_resource, OCW_NEXT_TEST_PREFIX, False)
    )

    assert len(content_data) == 4

    assert content_data[0] == {
        "content": "Pages Section",
        "content_type": "page",
        "key": "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/pages/",
        "published": True,
        "title": "Pages",
        "content_title": "Pages",
        "url": "../courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/pages/",
    }

    assert content_data[1] == {
        "content": "Course Meeting Times Lecture",
        "content_type": "page",
        "key": "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/pages/syllabus/",
        "published": True,
        "title": "Syllabus",
        "content_title": "Syllabus",
        "url": "../courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/pages/syllabus/",
    }

    assert content_data[2] == {
        "content": "TEXT",
        "content_type": "pdf",
        "description": "This resource contains problem set 1",
        "file_type": "application/pdf",
        "key": "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/resources/resource/",
        "learning_resource_types": [
            "Activity Assignments",
            "Activity Assignments with Examples",
        ],
        "published": True,
        "title": "Resource Title",
        "content_title": "Resource Title",
        "url": "../courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/resources/resource/",
    }

    assert content_data[3] == {
        "content": "TEXT",
        "content_type": "video",
        "description": "Video Description",
        "file_type": "video/mp4",
        "key": "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/resources/video/",
        "learning_resource_types": ["Competition Videos"],
        "published": True,
        "title": None,
        "content_title": None,
        "url": "../courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/resources/video/",
        "image_src": "https://img.youtube.com/vi/vKer2U5W5-s/default.jpg",
    }


@mock_s3
@pytest.mark.parametrize("overwrite", [True, False])
@pytest.mark.parametrize("modified_after_last_import", [True, False])
def test_transform_resource_needs_text_update(
    settings, mocker, overwrite, modified_after_last_import
):
    """
    Test transform_resource
    """

    setup_s3_ocw_next(settings)
    s3_resource = boto3.resource("s3")
    mock_tika = mocker.patch(
        "course_catalog.etl.ocw_next.extract_text_metadata",
        return_value={"content": "TEXT"},
    )
    s3_resource_object = s3_resource.Object(
        settings.OCW_NEXT_LIVE_BUCKET,
        "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/resources/resource/data.json",
    )
    resource_json = safe_load_json(
        get_s3_object_and_read(s3_resource_object), s3_resource_object.key
    )

    ContentFileFactory.create(
        key="courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/resources/resource/"
    )

    if modified_after_last_import:
        ContentFile.objects.update(updated_on=datetime(2020, 12, 1, tzinfo=pytz.utc))

    content_data = transform_resource(
        s3_resource_object.key, resource_json, s3_resource, overwrite
    )

    if overwrite or modified_after_last_import:
        mock_tika.assert_called_once()

        assert content_data["content"] == "TEXT"
    else:
        mock_tika.assert_not_called()
        assert "content" not in content_data
