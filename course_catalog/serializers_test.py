"""
Test course_catalog serializers
"""
import pytest

from course_catalog import factories
from course_catalog.constants import OfferedBy, ListType
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    CoursePriceFactory,
    CourseInstructorFactory,
    BootcampFactory,
    ProgramFactory,
    UserListFactory,
    LearningResourceRunFactory,
    ProgramItemCourseFactory,
)
from course_catalog.models import ProgramItem, FavoriteItem
from course_catalog.serializers import (
    CourseSerializer,
    BootcampSerializer,
    ProgramItemSerializer,
    FavoriteItemSerializer,
    UserListSerializer,
    ProgramSerializer,
    LearningResourceRunSerializer,
    UserListItemSerializer,
)
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "offered_by",
    [
        OfferedBy.mitx.value,
        OfferedBy.xpro.value,
        OfferedBy.micromasters.value,
        OfferedBy.ocw.value,
        OfferedBy.bootcamps.value,
    ],
)
def test_serialize_course_related_models(offered_by):
    """
    Verify that a serialized course contains attributes for related objects
    """
    course = CourseFactory(
        offered_by=offered_by, topics=CourseTopicFactory.create_batch(3)
    )
    serializer = CourseSerializer(course)
    assert len(serializer.data["topics"]) == 3
    assert "name" in serializer.data["topics"][0].keys()
    assert len(serializer.data["runs"]) == 3


def test_serialize_courserun_related_models():
    """
    Verify that a serialized course run contains attributes for related objects
    """
    courserun = LearningResourceRunFactory(
        prices=CoursePriceFactory.create_batch(2),
        instructors=CourseInstructorFactory.create_batch(2),
    )
    serializer = LearningResourceRunSerializer(courserun)
    assert len(serializer.data["prices"]) == 2
    for attr in ("mode", "price"):
        assert attr in serializer.data["prices"][0].keys()
    assert len(serializer.data["instructors"]) == 2
    for attr in ("first_name", "last_name", "full_name"):
        assert attr in serializer.data["instructors"][0].keys()


def test_serialize_bootcamp_related_models():
    """
    Verify that a serialized bootcamp contains attributes for related objects
    """
    bootcamp = BootcampFactory.create(topics=CourseTopicFactory.create_batch(3))
    serializer = BootcampSerializer(bootcamp)
    assert len(serializer.data["topics"]) == 3
    assert "name" in serializer.data["topics"][0].keys()
    assert len(serializer.data["runs"]) == 3


def test_serialize_program_related_models():
    """
    Verify that a serialized program contains attributes for related objects
    """
    program = ProgramFactory.create(topics=CourseTopicFactory.create_batch(3))
    ProgramItemCourseFactory.create_batch(4, program=program)
    serializer = ProgramSerializer(program)
    assert len(serializer.data["topics"]) == 3
    assert len(serializer.data["runs"]) == 1
    assert len(serializer.data["items"]) == 4
    assert "content_data" in serializer.data["items"][0].keys()


def test_generic_foreign_key_serializer():
    """
    Test that generic foreign key serializer properly rejects unexpected classes
    """
    program = ProgramFactory.create()
    course_topic = CourseTopicFactory.create()
    program_item = ProgramItem(program=program, item=course_topic)
    serializer = ProgramItemSerializer(program_item)
    with pytest.raises(Exception):
        assert serializer.data.get("item").get("id") == course_topic.id


@pytest.mark.parametrize(
    "list_type,valid",
    [
        [ListType.LIST.value, True],
        [ListType.LEARNING_PATH.value, True],
        ["bad_type", False],
        [None, False],
    ],
)
def test_userlist_serializer_validation(list_type, valid):
    """
    Test that the UserListSerializer validates list_type correctly
    """
    data = {"title": "My List", "list_type": list_type}
    serializer = UserListSerializer(data=data)
    assert serializer.is_valid() == valid


@pytest.mark.parametrize("object_exists", [True, False])
@pytest.mark.parametrize(
    "content_type,factory,valid_type",
    [
        ["course", "CourseFactory", True],
        ["program", "ProgramFactory", True],
        ["bootcamp", "BootcampFactory", True],
        ["user_list", "UserListFactory", True],
        ["user list item", "UserListCourseFactory", False],
        [None, "CourseFactory", False],
    ],
)
def test_userlistitem_serializer_validation(
    content_type, factory, valid_type, object_exists
):
    """
    Test that the UserListItemSerializer validates content_type and object correctly
    """
    userlist = UserListFactory.create()
    kwargs = (
        {"user_list": UserListFactory.create()}
        if factory == "UserListCourseFactory"
        else {}
    )
    # pylint:disable=redefined-builtin
    object_id = (
        getattr(factories, factory).create(**kwargs).id if object_exists else 1_001_001
    )
    data = {
        "content_type": content_type,
        "object_id": object_id,
        "user_list": userlist.id,
    }
    serializer = UserListItemSerializer(data=data)
    assert serializer.is_valid() == (valid_type and object_exists)


def test_favorites_serializer():
    """
    Test that the favorite serializer generic foreign key works and also rejects unexpected classes
    """
    user = UserFactory.create()
    course = CourseFactory.create()
    bootcamp = BootcampFactory.create()
    user_list = UserListFactory.create(author=user)
    program = ProgramFactory.create()
    course_topic = CourseTopicFactory.create()

    favorite_item = FavoriteItem(user=user, item=course)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == CourseSerializer(course).data

    favorite_item = FavoriteItem(user=user, item=bootcamp)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == BootcampSerializer(bootcamp).data

    favorite_item = FavoriteItem(user=user, item=user_list)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == UserListSerializer(user_list).data

    favorite_item = FavoriteItem(user=user, item=program)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == ProgramSerializer(program).data

    favorite_item = FavoriteItem(user=user, item=course_topic)
    serializer = FavoriteItemSerializer(favorite_item)
    with pytest.raises(Exception):
        assert serializer.data.get("content_data").get("id") == course_topic.id
