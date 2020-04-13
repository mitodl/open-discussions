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
    mock_load_programs = mocker.Mock()
    mocker.patch(
        "course_catalog.etl.loaders.load_programs", return_value=mock_load_programs
    )

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_programs):
        result = pipelines.micromasters_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_programs.return_value


def test_xpro_programs_etl(mocker):
    """Verify that xpro programs etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.xpro.extract_programs")
    mock_transform = mocker.patch("course_catalog.etl.xpro.transform_programs")
    mock_load_programs = mocker.Mock()

    mocker.patch(
        "course_catalog.etl.loaders.load_programs", return_value=mock_load_programs
    )

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_programs):
        result = pipelines.xpro_programs_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_programs.return_value


def test_xpro_courses_etl(mocker):
    """Verify that xpro courses etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.xpro.extract_courses")
    mock_transform = mocker.patch("course_catalog.etl.xpro.transform_courses")
    mock_load_courses = mocker.patch("course_catalog.etl.loaders.load_courses")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_courses):
        result = pipelines.xpro_courses_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_courses.return_value


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


def test_oll_etl(mocker):
    """Verify that OLL etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.oll.extract")
    mock_transform = mocker.patch("course_catalog.etl.oll.transform")
    mock_load_courses = mocker.patch("course_catalog.etl.loaders.load_courses")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_courses):
        result = pipelines.oll_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_courses.return_value


def test_see_etl(mocker):
    """Verify that SEE etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.see.extract")
    mock_transform = mocker.patch("course_catalog.etl.see.transform")
    mock_load_courses = mocker.patch("course_catalog.etl.loaders.load_courses")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_courses):
        result = pipelines.see_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_courses.return_value


def test_mitpe_etl(mocker):
    """Verify that MITPE etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.mitpe.extract")
    mock_transform = mocker.patch("course_catalog.etl.mitpe.transform")
    mock_load_courses = mocker.patch("course_catalog.etl.loaders.load_courses")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_courses):
        result = pipelines.mitpe_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_courses.return_value


def test_csail_etl(mocker):
    """Verify that CSAIL etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.csail.extract")
    mock_transform = mocker.patch("course_catalog.etl.csail.transform")
    mock_load_courses = mocker.patch("course_catalog.etl.loaders.load_courses")

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_courses):
        result = pipelines.csail_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_courses.return_value


def test_youtube_etl(mocker):
    """Verify that youtube etl pipeline executes correctly"""
    mock_extract = mocker.patch("course_catalog.etl.youtube.extract")
    mock_transform = mocker.patch("course_catalog.etl.youtube.transform")
    mock_load_video_channels = mocker.patch(
        "course_catalog.etl.loaders.load_video_channels"
    )

    with reload_mocked_pipeline(mock_extract, mock_transform, mock_load_video_channels):
        result = pipelines.youtube_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_video_channels.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_video_channels.return_value
