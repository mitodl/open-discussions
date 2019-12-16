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
    UserListCourseFactory,
)
from course_catalog.models import FavoriteItem, UserListItem
from course_catalog.serializers import (
    CourseSerializer,
    BootcampSerializer,
    FavoriteItemSerializer,
    UserListSerializer,
    ProgramSerializer,
    LearningResourceRunSerializer,
    UserListItemSerializer,
    SimpleUserListSerializer,
    SimpleUserListItemSerializer,
    SimpleCourseSerializer,
    SimpleBootcampSerializer,
    SimpleProgramSerializer,
    CourseTopicSerializer,
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


@pytest.mark.parametrize(
    "factory,valid_type",
    [
        ["CourseFactory", True],
        ["ProgramFactory", True],
        ["BootcampFactory", True],
        ["UserListFactory", True],
        ["VideoFactory", True],
        ["CourseTopicFactory", False],
    ],
)
def test_generic_foreign_key_serializer_classes(factory, valid_type):
    """
    Test that generic foreign key serializer properly accepts expected classes and rejects others
    """
    userlist = UserListFactory.create()
    kwargs = (
        {"user_list": UserListFactory.create()}
        if factory == "UserListCourseFactory"
        else {}
    )
    obj = getattr(factories, factory).create(**kwargs)
    list_item = UserListItem(user_list=userlist, item=obj)
    serializer = UserListItemSerializer(list_item)
    if valid_type:
        assert serializer.data.get("content_data").get("id") == obj.id
    else:
        with pytest.raises(Exception):
            assert serializer.data.get("content_data").get("id") == obj.id


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
    Test that the UserListSerializer validates list_type and topics correctly
    """
    topics = CourseTopicFactory.create_batch(2)
    data = {
        "title": "My List",
        "list_type": list_type,
        "topics": [topic.id for topic in topics],
    }
    serializer = UserListSerializer(data=data)
    assert serializer.is_valid() is valid
    data["topics"] = CourseTopicSerializer(instance=topics, many=True).data
    serializer = UserListSerializer(data=data)
    assert serializer.is_valid() is valid


@pytest.mark.parametrize(
    "data, error",
    [
        [9999, "Invalid topic ids: {9999}"],
        [None, "Invalid topic ids: {None}"],
        ["a", "Topic ids must be integers"],
    ],
)
def test_userlist_serializer_validation_bad_topic(data, error):
    """
    Test that the UserListSerializer invalidates a non-existent topic
    """
    data = {
        "title": "My List",
        "list_type": ListType.LEARNING_PATH.value,
        "topics": [data],
    }
    serializer = UserListSerializer(data=data)
    assert serializer.is_valid() is False
    assert serializer.errors["topics"][0] == error


@pytest.mark.parametrize(
    "list_type,valid",
    [
        [ListType.LIST.value, True],
        [ListType.LEARNING_PATH.value, True],
        ["bad_type", False],
        [None, False],
    ],
)
def test_simple_userlist_serializer_validation(list_type, valid):
    """
    Test that the SimpleUserListSerializer validates list_type correctly
    """
    data = {"title": "My List", "list_type": list_type}
    serializer = SimpleUserListSerializer(data=data)
    assert serializer.is_valid() == valid


@pytest.mark.parametrize("object_exists", [True, False])
@pytest.mark.parametrize(
    "content_type,factory,valid_type",
    [
        ["course", "CourseFactory", True],
        ["program", "ProgramFactory", True],
        ["bootcamp", "BootcampFactory", True],
        ["video", "VideoFactory", True],
        ["userlist", "UserListFactory", False],
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


def test_simpleuserlistitem_serializer():
    """
    Test that the SimpleUserListItemSerializer includes expected data
    """
    course = CourseFactory.create()
    userlistitem = UserListCourseFactory.create(
        content_object=course, user_list=UserListFactory.create()
    )
    item_serializer = SimpleUserListItemSerializer(instance=userlistitem)
    assert item_serializer.data["content_type"] == userlistitem.content_type.name
    assert item_serializer.data["object_id"] == userlistitem.object_id
    list_serializer = SimpleUserListSerializer(instance=userlistitem.user_list)
    assert list_serializer.data["items"][0] == item_serializer.data


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
    assert serializer.data.get("content_data") == SimpleCourseSerializer(course).data

    favorite_item = FavoriteItem(user=user, item=bootcamp)
    serializer = FavoriteItemSerializer(favorite_item)
    assert (
        serializer.data.get("content_data") == SimpleBootcampSerializer(bootcamp).data
    )

    favorite_item = FavoriteItem(user=user, item=user_list)
    serializer = FavoriteItemSerializer(favorite_item)
    assert (
        serializer.data.get("content_data") == SimpleUserListSerializer(user_list).data
    )

    favorite_item = FavoriteItem(user=user, item=program)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == SimpleProgramSerializer(program).data

    favorite_item = FavoriteItem(user=user, item=course_topic)
    serializer = FavoriteItemSerializer(favorite_item)
    with pytest.raises(Exception):
        assert serializer.data.get("content_data").get("id") == course_topic.id
