"""Tests for ETL pipelines"""
from importlib import reload

from course_catalog.etl import pipelines


def test_micromasters_etl(mocker):
    """Verify that the etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.micromasters.extract")
    mock_transform = mocker.patch("course_catalog.etl.micromasters.transform")
    mock_load_programs = mocker.patch("course_catalog.etl.loaders.load_programs")

    # reload the module with our mocks
    # since functools swallows the original reference
    reload(pipelines)

    result = pipelines.micromasters_etl()

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
