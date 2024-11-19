"""Tests for email_validation_api"""
import csv
import os
from urllib.parse import urljoin

import pytest
import responses
from responses.matchers import multipart_matcher

from authentication import email_validation_api

pytestmark = [pytest.mark.usefixtures("mocked_responses")]


class _ContextManagerEntered(Exception):
    """Dummy exception for testing"""


def test_csv_batch_file():
    """Test that csv_batch_file creates a temporary csv file with a header"""
    with pytest.raises(_ContextManagerEntered):
        with email_validation_api.csv_batch_file("test-file") as batch_file:
            assert batch_file.name == "test-file"

            assert batch_file.writer.__class__ == csv.DictWriter

            raise _ContextManagerEntered

    with open(batch_file.file.name, "r") as csv_file:
        assert csv_file.read().splitlines() == ["email"]

    os.remove(batch_file.file.name)


def test_send_to_mailgun(mocker, mocked_responses):
    """Test that send_to_mailgun sends the passed CSV file to mailgun"""
    csv_data = "emails\ntest@example.com"
    mock_csv_file = mocker.Mock()
    mock_csv_file.name = "/tmp/abc123.csv"
    mocked_csv_open = mocker.mock_open(read_data=csv_data)
    mocker.patch("authentication.email_validation_api.open", mocked_csv_open)

    mock_resp = mocked_responses.add(
        responses.POST,
        urljoin(email_validation_api.VALIDATION_API_URL, "abc123"),
        match=[
            multipart_matcher(
                {
                    "file": csv_data,
                }
            )
        ],
    )
    csv_batch = email_validation_api.CsvBatchFile(
        "abc123", mock_csv_file, mocker.Mock()
    )

    email_validation_api.send_to_mailgun(csv_batch)

    assert mock_resp.call_count == 1
