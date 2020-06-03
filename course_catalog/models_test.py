"""
course_catalog models tests
"""

import pytest

from course_catalog.factories import (
    UserListFactory,
    UserListItemFactory,
    CourseFactory,
    LearningResourceRunFactory,
    LearningResourceOfferorFactory,
    ProgramFactory,
)
from course_catalog.constants import PlatformType, AvailabilityType, OfferedBy


@pytest.mark.django_db
@pytest.mark.parametrize(
    "kwargs",
    [
        {"is_course": True},
        {"is_program": True},
        {"is_video": True},
        {"is_userlist": True},
    ],
)
def test_cascade_delete_listitems(kwargs):
    """
    When a resource is deleted, UserListItems for that resource should be deleted
    """
    user_list = UserListFactory.create()
    list_item = UserListItemFactory.create(user_list=user_list, **kwargs)
    assert user_list.items.count() == 1
    resource = list_item.item
    resource.delete()
    assert user_list.items.count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize(
    "platform", [PlatformType.bootcamps.value, PlatformType.ocw.value]
)
def test_course_audience(platform):
    """
    Should return the correct audience for the course
    """
    course = CourseFactory.create(platform=platform)
    if platform == PlatformType.bootcamps.value:
        assert course.audience == ["Professional Offerings"]
    else:
        assert course.audience == ["Open Content"]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "platform",
    [PlatformType.bootcamps.value, PlatformType.ocw.value, PlatformType.mitx.value],
)
@pytest.mark.parametrize(
    "availability", [availability_type.value for availability_type in AvailabilityType]
)
def test_course_certification(platform, availability):
    """
    Should return the correct certification for the course
    """
    course = CourseFactory.create(platform=platform)
    course.runs.set([LearningResourceRunFactory(availability=availability)])

    if platform == PlatformType.bootcamps.value:
        assert course.certification == ["Certificates"]
    elif platform == PlatformType.ocw.value:
        assert course.certification == []
    elif availability == AvailabilityType.archived.value:
        assert course.certification == []
    else:
        assert course.certification == ["Certificates"]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "offered_by", [OfferedBy.micromasters.value, OfferedBy.xpro.value]
)
def test_program_audience(offered_by):
    """
    Should return the correct audience for the program
    """
    program = ProgramFactory.create()
    program.offered_by.set([LearningResourceOfferorFactory(name=offered_by)])

    if offered_by == OfferedBy.micromasters.value:
        assert program.audience == ["Open Content", "Professional Offerings"]
    else:
        assert program.audience == ["Professional Offerings"]


@pytest.mark.django_db
def test_userlist_audience():
    """
    Should return the correct audience for the userlist
    """
    user_list = UserListFactory.create()
    open_learning_resource = CourseFactory.create(platform=PlatformType.ocw.value)
    not_open_learning_resource = CourseFactory.create(
        platform=PlatformType.bootcamps.value
    )

    UserListItemFactory.create(
        user_list=user_list, content_object=open_learning_resource
    )
    assert user_list.audience == ["Open Content"]

    UserListItemFactory.create(
        user_list=user_list, content_object=not_open_learning_resource
    )
    assert user_list.audience == []
