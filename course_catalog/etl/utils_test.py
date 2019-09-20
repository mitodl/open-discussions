"""ETL utils test"""
import pytest

from course_catalog.etl.utils import log_exceptions


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
