"""Tests for ETL pipelines"""
from importlib import reload
import pytest

from course_catalog.etl import pipelines


@pytest.mark.parametrize("platform", ["micromasters", "xpro"])
def test_etl_pipelines(mocker, platform):
    """Verify that the etl pipelines execute correctly"""
    mock_extract = mocker.patch(f"course_catalog.etl.{platform}.extract")
    mock_transform = mocker.patch(f"course_catalog.etl.{platform}.transform")
    mock_load_programs = mocker.patch("course_catalog.etl.loaders.load_programs")

    # reload the module with our mocks
    # since functools swallows the original reference
    reload(pipelines)

    etl_func = getattr(pipelines, f"{platform}_etl")
    result = etl_func()

    # stop the mocks
    mock_extract.stop()
    mock_transform.stop()
    mock_load_programs.stop()

    # restore the module without our mocks
    reload(pipelines)

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_programs.return_value
