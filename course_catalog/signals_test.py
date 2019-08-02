"""
Test course_catalog signals
"""
import pytest

from course_catalog.factories import CourseFactory


@pytest.mark.django_db
def test_delete_course_signal(mocker):
    """Test that delete_course is called to remove the class from the index """
    mock_delete = mocker.patch("course_catalog.signals.delete_course")
    course = CourseFactory.create()
    course.delete()
    mock_delete.assert_called_once_with(course)
