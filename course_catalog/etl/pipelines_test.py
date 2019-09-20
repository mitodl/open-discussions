"""Tests for ETL pipelines"""
from contextlib import contextmanager
from importlib import reload

from course_catalog.etl import pipelines


@contextmanager
def reload_mocked_pipeline(*mocks):
    """Create a context that is rolled back after executing the pipeline"""
    reload(pipelines)

    yield

    for mock in mocks:
        mock.stop()

    reload(pipelines)


def test_micromasters_etl(mocker):
    """Verify that micromasters etl pipeline executes correctly"""
    values = [1, 2, 3]
    mock_extract = mocker.patch("course_catalog.etl.micromasters.extract")
    mock_transform = mocker.patch(
        "course_catalog.etl.micromasters.transform", return_value=values
    )
    mock_load_programs = mocker.patch("course_catalog.etl.loaders.load_programs")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_programs):
        result = pipelines.micromasters_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_programs.return_value


def test_xpro_etl(mocker):
    """Verify that xpro etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.xpro.extract")
    mock_transform = mocker.patch("course_catalog.etl.xpro.transform")
    mock_load_programs = mocker.patch("course_catalog.etl.loaders.load_programs")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_programs):
        result = pipelines.xpro_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_programs.return_value


def test_mitx_etl(mocker):
    """Verify that mitx etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.mitx.extract")
    mock_transform = mocker.patch("course_catalog.etl.mitx.transform")
    mock_load_courses = mocker.patch("course_catalog.etl.loaders.load_courses")
    mock_upload_manifest = mocker.patch(
        "course_catalog.etl.ocw.upload_mitx_course_manifest"
    )

    with reload_mocked_pipeline(
        mock_extract, mock_transform, mock_load_courses, mock_upload_manifest
    ):
        result = pipelines.mitx_etl()

    mock_extract.assert_called_once_with()

    # each of these should be called with the return value of the extract
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_upload_manifest.assert_called_once_with(mock_extract.return_value)

    # load_courses should be called *only* with the return value of transform
    mock_load_courses.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_courses.return_value
