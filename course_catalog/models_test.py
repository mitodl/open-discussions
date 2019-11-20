"""
course_catalog models tests
"""

import pytest

from course_catalog.factories import (
    UserListFactory,
    UserListCourseFactory,
    UserListBootcampFactory,
    UserListProgramFactory,
    UserListVideoFactory,
    UserListUserListFactory,
)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "factory",
    [
        UserListCourseFactory,
        UserListBootcampFactory,
        UserListProgramFactory,
        UserListVideoFactory,
        UserListUserListFactory,
    ],
)
def test_cascade_delete_listitems(factory):
    """
    When a resource is deleted, UserListItems for that resource should be deleted
    """
    user_list = UserListFactory.create()
    list_item = factory.create(user_list=user_list)
    assert user_list.items.count() == 1
    resource = list_item.item
    resource.delete()
    assert user_list.items.count() == 0
