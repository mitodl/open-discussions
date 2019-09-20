"""Tests for the MITx ETL functions"""
from course_catalog.etl.mitx import transform


def test_mitx_transform_non_mit_owner(non_mitx_course_data):
    """Verify that courses with non-MIT owners are filtered out"""
    assert len(transform(non_mitx_course_data["results"])) == 0


def test_mitx_transform_mit_owner(mitx_course_data):
    """Verify that courses with MIT owners show up"""
    assert len(transform(mitx_course_data["results"])) == 1
