"""ETL utils test"""
import pytest

from course_catalog.etl.utils import log_exceptions, sync_s3_text, extract_text_metadata


@pytest.mark.parametrize("side_effect", ["One", Exception("error")])
def test_log_exceptions(mocker, side_effect):
    """Test that log_exceptions executes the function and absorbs exceptions"""
    func = mocker.Mock(
        side_effect=side_effect
        if isinstance(side_effect, Exception)
        else lambda *args, **kwargs: side_effect
    )
    wrapped_func = log_exceptions("Error message", exc_return_value="Error Value")(func)
    mock_log = mocker.patch("course_catalog.etl.utils.log")

    result = wrapped_func(1, 2, val=3)

    if isinstance(side_effect, Exception):
        mock_log.exception.assert_called_once_with("Error message")
        assert result == "Error Value"
    else:
        mock_log.exception.assert_not_called()
        assert result == side_effect

    func.assert_called_once_with(1, 2, val=3)


@pytest.mark.parametrize("has_bucket", [True, False])
@pytest.mark.parametrize("metadata", [None, {"foo": "bar"}])
def test_sync_s3_text(mock_ocw_learning_bucket, has_bucket, metadata):
    """
    Verify data is saved to S3 if a bucket and metadata are provided
    """
    key = "fake_key"
    sync_s3_text(mock_ocw_learning_bucket.bucket if has_bucket else None, key, metadata)
    s3_objects = [
        s3_obj
        for s3_obj in mock_ocw_learning_bucket.bucket.objects.filter(
            Prefix=f"extracts/{key}"
        )
    ]
    assert len(s3_objects) == (1 if has_bucket and metadata is not None else 0)


@pytest.mark.parametrize("token", ["abc123", "", None])
@pytest.mark.parametrize("data", [b"data", b"", None])
def test_extract_text_metadata(mocker, data, token, settings):
    """
    Verify that tika is called and returns a response
    """
    settings.TIKA_ACCESS_TOKEN = token
    mock_response = {"metadata": {"Author:": "MIT"}, "content": "Extracted text"}
    mock_tika = mocker.patch(
        "course_catalog.etl.utils.tika_parser.from_buffer", return_value=mock_response
    )
    response = extract_text_metadata(data)
    options = {}
    if token:
        options["headers"] = {"X-Access-Token": token}
    if data:
        assert response == mock_response
        mock_tika.assert_called_once_with(data, requestOptions=options)
    else:
        assert response is None
        mock_tika.assert_not_called()
