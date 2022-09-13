"""Tests for the MITx ETL functions"""
import copy

from course_catalog.etl.mitx import EDX_TOPIC_MAPPINGS, transform


def test_mitx_transform_non_mit_owner(non_mitx_course_data):
    """Verify that courses with non-MIT owners are filtered out"""
    assert len(list(transform(non_mitx_course_data["results"]))) == 0


def test_mitx_transform_mit_owner(mitx_course_data):
    """Verify that courses with MIT owners show up"""
    assert len(list(transform(mitx_course_data["results"]))) == 2


def test_mitx_transform_remap_topics(mocker, mitx_course_data):
    """Verify that course topics are remapped correctly"""
    mock_log = mocker.patch("course_catalog.etl.mitx.log", autospec=True)

    for edx_topic, expected_topic in EDX_TOPIC_MAPPINGS.items():
        mock_log.reset_mock()

        data = copy.deepcopy(mitx_course_data["results"])
        data[0]["subjects"] = [{"name": edx_topic}, {"name": "this topic isn't mapped"}]

        course = next(transform(data))

        mock_log.info.assert_called_once_with(
            "Failed to map mitx topic '%s' for course '%s'",
            "this topic isn't mapped",
            course["course_id"],
        )

        assert course["topics"] == [{"name": expected_topic}]
