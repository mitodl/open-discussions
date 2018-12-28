"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import Mock

import pytest
from rest_framework.exceptions import ValidationError

from channels.serializers.reports import ReportSerializer, ReportedContentSerializer


pytestmark = pytest.mark.django_db


def test_report_validate_no_ids():
    """validate either post_id or comment_id needs to be specified"""
    with pytest.raises(ValidationError) as ex:
        ReportSerializer().validate({})
    assert (
        ex.value.args[0] == "You must provide one of either 'post_id' or 'comment_id'"
    )


def test_report_validate_both_ids():
    """validate either post_id or comment_id needs to be specified"""
    with pytest.raises(ValidationError) as ex:
        ReportSerializer().validate({"comment_id": "1", "post_id": "2"})
    assert (
        ex.value.args[0]
        == "You must provide only one of either 'post_id' or 'comment_id', not both"
    )


def test_report_validate_one_id():
    """validate passes if only comment_id or post_id is specified"""
    serializer = ReportSerializer()
    serializer.validate({"post_id": "2"})
    serializer.validate({"comment_id": "1"})


def test_report_comment_create():
    """Adds a comment report"""
    payload = {"comment_id": "abc", "reason": "reason"}
    api_mock = Mock()
    assert (
        ReportSerializer(
            context={"channel_api": api_mock, "request": Mock(), "view": Mock()}
        ).create(payload)
        == payload
    )
    api_mock.report_comment.assert_called_once_with("abc", "reason")


def test_report_post_create():
    """Adds a post report"""
    payload = {"post_id": "abc", "reason": "reason"}
    api_mock = Mock()
    assert (
        ReportSerializer(
            context={"channel_api": api_mock, "request": Mock(), "view": Mock()}
        ).create(payload)
        == payload
    )
    api_mock.report_post.assert_called_once_with("abc", "reason")


def test_reported_comment():
    """Serialize of a reported content object"""
    reported_content = Mock()
    reported_content.user_reports = [["spam", 1]]
    reported_content.mod_reports = [["spam", "jane"], ["junk", "jow"]]
    assert ReportedContentSerializer().get_reasons(reported_content) == sorted(
        ["spam", "junk"]
    )
