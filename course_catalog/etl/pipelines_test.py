"""Tests for ETL pipelines"""
from contextlib import contextmanager
from importlib import reload
from unittest.mock import patch

import pytest

from course_catalog.constants import PlatformType
from course_catalog.etl import pipelines
from course_catalog.etl.constants import (
    CourseLoaderConfig,
    LearningResourceRunLoaderConfig,
    OfferedByLoaderConfig,
    ProgramLoaderConfig,
)
from course_catalog.etl.prolearn import PROLEARN_DEPARTMENT_MAPPING
from course_catalog.factories import CourseFactory, ProgramFactory


@contextmanager
def reload_mocked_pipeline(*patchers):
    """Create a context that is rolled back after executing the pipeline"""
    mocks = [patcher.start() for patcher in patchers]

    reload(pipelines)

    yield mocks

    for patcher in patchers:
        patcher.stop()

    reload(pipelines)


def test_micromasters_etl():
    """Verify that micromasters etl pipeline executes correctly"""
    values = [1, 2, 3]

    with reload_mocked_pipeline(
        patch("course_catalog.etl.micromasters.extract", autospec=True),
        patch(
            "course_catalog.etl.micromasters.transform",
            return_value=values,
            autospec=True,
        ),
        patch("course_catalog.etl.loaders.load_programs", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_programs = patches
        result = pipelines.micromasters_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(
        PlatformType.micromasters.value,
        mock_transform.return_value,
        config=ProgramLoaderConfig(
            courses=CourseLoaderConfig(
                offered_by=OfferedByLoaderConfig(additive=True),
                runs=LearningResourceRunLoaderConfig(
                    offered_by=OfferedByLoaderConfig(additive=True)
                ),
            )
        ),
    )

    assert result == mock_load_programs.return_value


def test_xpro_programs_etl():
    """Verify that xpro programs etl pipeline executes correctly"""
    with reload_mocked_pipeline(
        patch("course_catalog.etl.xpro.extract_programs", autospec=True),
        patch("course_catalog.etl.xpro.transform_programs", autospec=True),
        patch("course_catalog.etl.loaders.load_programs", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_programs = patches
        result = pipelines.xpro_programs_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_programs.assert_called_once_with(
        PlatformType.xpro.value, mock_transform.return_value
    )

    assert result == mock_load_programs.return_value


def test_xpro_courses_etl():
    """Verify that xpro courses etl pipeline executes correctly"""
    with reload_mocked_pipeline(
        patch("course_catalog.etl.xpro.extract_courses", autospec=True),
        patch("course_catalog.etl.xpro.transform_courses", autospec=True),
        patch("course_catalog.etl.loaders.load_courses", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_courses = patches
        result = pipelines.xpro_courses_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(
        PlatformType.xpro.value,
        mock_transform.return_value,
        config=CourseLoaderConfig(prune=True),
    )

    assert result == mock_load_courses.return_value


def test_mitx_etl():
    """Verify that mitx etl pipeline executes correctly"""
    with reload_mocked_pipeline(
        patch("course_catalog.etl.mitx.extract", autospec=True),
        patch("course_catalog.etl.mitx.transform", autospec=False),
        patch("course_catalog.etl.loaders.load_courses", autospec=True),
        patch("course_catalog.etl.ocw.upload_mitx_course_manifest", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_courses, mock_upload_manifest = patches
        result = pipelines.mitx_etl()

    mock_extract.assert_called_once_with()

    # each of these should be called with the return value of the extract
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_upload_manifest.assert_called_once_with(mock_extract.return_value)

    # load_courses should be called *only* with the return value of transform
    mock_load_courses.assert_called_once_with(
        PlatformType.mitx.value,
        mock_transform.return_value,
        config=CourseLoaderConfig(
            prune=True,
            offered_by=OfferedByLoaderConfig(additive=True),
            runs=LearningResourceRunLoaderConfig(
                offered_by=OfferedByLoaderConfig(additive=True)
            ),
        ),
    )

    assert result == mock_load_courses.return_value


def test_oll_etl():
    """Verify that OLL etl pipeline executes correctly"""
    with reload_mocked_pipeline(
        patch("course_catalog.etl.oll.extract", autospec=True),
        patch("course_catalog.etl.oll.transform", autospec=False),
        patch("course_catalog.etl.loaders.load_courses", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_courses = patches
        result = pipelines.oll_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_courses.assert_called_once_with(
        PlatformType.oll.value,
        mock_transform.return_value,
        config=CourseLoaderConfig(prune=True),
    )

    assert result == mock_load_courses.return_value


def test_youtube_etl():
    """Verify that youtube etl pipeline executes correctly"""
    with reload_mocked_pipeline(
        patch("course_catalog.etl.youtube.extract", autospec=True),
        patch("course_catalog.etl.youtube.transform", autospec=True),
        patch("course_catalog.etl.loaders.load_video_channels", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_video_channels = patches
        result = pipelines.youtube_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_video_channels.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_video_channels.return_value


def test_podcast_etl():
    """Verify that podcast etl pipeline executes correctly"""
    with reload_mocked_pipeline(
        patch("course_catalog.etl.podcast.extract", autospec=True),
        patch("course_catalog.etl.podcast.transform", autospec=True),
        patch("course_catalog.etl.loaders.load_podcasts", autospec=True),
    ) as patches:
        mock_extract, mock_transform, mock_load_podcasts = patches
        result = pipelines.podcast_etl()

    mock_extract.assert_called_once_with()
    mock_transform.assert_called_once_with(mock_extract.return_value)
    mock_load_podcasts.assert_called_once_with(mock_transform.return_value)

    assert result == mock_load_podcasts.return_value


@pytest.mark.django_db
def test_prolearn_programs_etl():
    """Verify that the prolearn programs etl executes correctly"""
    platforms = PROLEARN_DEPARTMENT_MAPPING.keys()
    mock_programs = ProgramFactory.create_batch(len(platforms))
    with reload_mocked_pipeline(
        patch("course_catalog.etl.prolearn.extract_programs", autospec=True),
        patch("course_catalog.etl.prolearn.transform_programs", autospec=True),
        patch(
            "course_catalog.etl.loaders.load_programs",
            autospec=True,
            side_effect=[[mock_result] for mock_result in mock_programs],
        ),
    ) as patches:
        mock_extract, mock_transform, mock_load_programs = patches
        result = pipelines.prolearn_programs_etl()

        assert mock_transform.call_count == len(platforms)
        for platform in platforms:
            mock_extract.assert_any_call(platform)
            mock_load_programs.assert_any_call(platform, mock_transform.return_value)
        assert result == mock_programs


@pytest.mark.django_db
def test_prolearn_courses_etl():
    """Verify that the prolearn courses etl executes correctly"""
    platforms = PROLEARN_DEPARTMENT_MAPPING.keys()
    mock_courses = CourseFactory.create_batch(len(platforms))
    with reload_mocked_pipeline(
        patch("course_catalog.etl.prolearn.extract_courses", autospec=True),
        patch("course_catalog.etl.prolearn.transform_courses", autospec=True),
        patch(
            "course_catalog.etl.loaders.load_courses",
            autospec=True,
            side_effect=[[mock_result] for mock_result in mock_courses],
        ),
    ) as patches:
        mock_extract, mock_transform, mock_load_courses = patches
        result = pipelines.prolearn_courses_etl()

        assert mock_transform.call_count == len(platforms)
        for platform in platforms:
            mock_extract.assert_any_call(platform)
            mock_load_courses.assert_any_call(platform, mock_transform.return_value)
        assert result == mock_courses
