"""Tests for exceptions"""
import pytest
from django.template import RequestContext
from rest_framework.exceptions import ValidationError

from open_discussions import exceptions


@pytest.mark.parametrize("data", [{}, None, "data"])
@pytest.mark.parametrize(
    "exception, sentry_called",
    [(Exception(), False), (ValidationError("field is invalid"), True)],
)
def test_api_exception_handler(mocker, rf, data, exception, sentry_called):
    """
    Test a standard exception not handled by default by the rest framework
    """
    mock_sentry = mocker.patch(
        "raven.contrib.django.raven_compat.models.client.captureException",
        autospec=True,
    )
    mock_default_handler = mocker.patch(
        "open_discussions.exceptions.exception_handler",
        return_value=mocker.Mock(data=data),
    )

    context = RequestContext(rf.get("/"))

    resp = exceptions.api_exception_handler(exception, context)

    mock_default_handler.assert_called_once_with(exception, context)
    if sentry_called:
        mock_sentry.assert_called_once_with()
    else:
        mock_sentry.assert_not_called()

    assert resp == mock_default_handler.return_value
    if isinstance(data, dict):
        assert resp.data["error_type"] == exception.__class__.__name__
