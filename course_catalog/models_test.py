"""
course_catalog models tests
"""

import pytest

from course_catalog.factories import UserListFactory, UserListItemFactory


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
