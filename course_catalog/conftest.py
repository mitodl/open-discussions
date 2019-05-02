"""Common fixtures for course_catalog"""
from types import SimpleNamespace

import pytest


@pytest.fixture
def get_micromasters_data(mocker):
    """
    Mock function to retrieve micromasters data
    """
    micromasters_data = [
        {
            "edx_course_key": "MITx/14_73x/1T2014",
            "program_title": "Data, Economics, and Development Policy",
        },
        {
            "edx_course_key": "MITx/ESD.SCM1x/3T2014",
            "program_title": "Supply Chain Management",
        },
        {
            "edx_course_key": "course-v1:MITx+ESD.SCM1x+3T2014",
            "program_title": "Supply Chain Management",
        },
        {
            "edx_course_key": "course-v1:MITx+CTL.SC1x_1+2T2015",
            "program_title": "Supply Chain Management",
        },
    ]
    mocker.patch(
        "course_catalog.task_helpers.get_micromasters_data",
        return_value=micromasters_data,
    )


@pytest.fixture
def mock_course_index_functions(mocker):
    """Mocks index updating functions for courses"""
    return SimpleNamespace(
        update_course=mocker.patch("course_catalog.task_helpers.update_course"),
        index_new_course=mocker.patch("course_catalog.task_helpers.index_new_course"),
    )
