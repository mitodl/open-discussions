"""
Test course_catalog serializers
"""
import pytest

from course_catalog import factories
from course_catalog.api_test import ocw_next_valid_data  # pylint:disable=unused-import
from course_catalog.constants import (
    OCW_DEPARTMENTS,
    OfferedBy,
    StaffListType,
    UserListType,
)
from course_catalog.factories import (
    CourseFactory,
    CourseInstructorFactory,
    CoursePriceFactory,
    CourseTopicFactory,
    LearningResourceOfferorFactory,
    LearningResourceRunFactory,
    PodcastEpisodeFactory,
    PodcastFactory,
    ProgramFactory,
    ProgramItemCourseFactory,
    StaffListFactory,
    UserListFactory,
    VideoFactory,
)
from course_catalog.models import FavoriteItem, StaffListItem, UserListItem
from course_catalog.serializers import (
    CourseSerializer,
    CourseTopicSerializer,
    FavoriteItemSerializer,
    LearningResourceRunSerializer,
    OCWNextSerializer,
    PodcastEpisodeSerializer,
    PodcastSerializer,
    ProgramSerializer,
    StaffListItemSerializer,
    StaffListSerializer,
    UserListItemSerializer,
    UserListSerializer,
    VideoSerializer,
)
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


datetime_format = "%Y-%m-%dT%H:%M:%SZ"
datetime_millis_format = "%Y-%m-%dT%H:%M:%S.%fZ"


@pytest.mark.parametrize(
    "offered_by",
    [
        OfferedBy.mitx.value,
        OfferedBy.xpro.value,
        OfferedBy.micromasters.value,
        OfferedBy.ocw.value,
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
    assert (
        serializer.data["department_slug"]
        == OCW_DEPARTMENTS[
            course.department[0]  # pylint:disable=unsubscriptable-object
        ]["slug"]
    )


def test_serialize_courserun_related_models():
    """
    Verify that a serialized course run contains attributes for related objects
    """
    courserun = LearningResourceRunFactory(
        prices=CoursePriceFactory.create_batch(2),
        instructors=CourseInstructorFactory.create_batch(2),
    )
    serializer = LearningResourceRunSerializer(courserun)
    assert "raw_json" not in serializer.data
    assert len(serializer.data["prices"]) == 2
    for attr in ("mode", "price"):
        assert attr in serializer.data["prices"][0].keys()
    assert len(serializer.data["instructors"]) == 2
    for attr in ("first_name", "last_name", "full_name"):
        assert attr in serializer.data["instructors"][0].keys()


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
    obj = getattr(factories, factory).create()
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
        [UserListType.LIST.value, True],
        [UserListType.LEARNING_PATH.value, True],
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
        "list_type": UserListType.LEARNING_PATH.value,
        "topics": [data],
    }
    serializer = UserListSerializer(data=data)
    assert serializer.is_valid() is False
    assert serializer.errors["topics"][0] == error


@pytest.mark.parametrize("object_exists", [True, False])
@pytest.mark.parametrize(
    "content_type,factory,valid_type",
    [
        ["course", "CourseFactory", True],
        ["program", "ProgramFactory", True],
        ["video", "VideoFactory", True],
        ["userlist", "UserListFactory", False],
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
    # pylint:disable=redefined-builtin
    object_id = getattr(factories, factory).create().id if object_exists else 1_001_001
    data = {
        "content_type": content_type,
        "object_id": object_id,
        "user_list": userlist.id,
        "image_src": "https://test.edu/myimage.jpg",
    }
    serializer = UserListItemSerializer(data=data)
    assert serializer.is_valid() == (valid_type and object_exists)


def test_favorites_serializer():
    """
    Test that the favorite serializer generic foreign key works and also rejects unexpected classes
    """
    user = UserFactory.create()
    course = CourseFactory.create()
    user_list = UserListFactory.create(author=user)
    program = ProgramFactory.create()
    video = VideoFactory.create()
    podcast = PodcastFactory.create()
    podcast_episode = PodcastEpisodeFactory.create()
    course_topic = CourseTopicFactory.create()

    favorite_item = FavoriteItem(user=user, item=course)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == {
        **CourseSerializer(course).data,
        "is_favorite": True,
    }

    favorite_item = FavoriteItem(user=user, item=user_list)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == {
        **UserListSerializer(user_list).data,
        "is_favorite": True,
    }

    favorite_item = FavoriteItem(user=user, item=program)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == {
        **ProgramSerializer(program).data,
        "is_favorite": True,
    }

    favorite_item = FavoriteItem(user=user, item=video)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == {
        **VideoSerializer(video).data,
        "is_favorite": True,
    }

    favorite_item = FavoriteItem(user=user, item=podcast)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == {
        **PodcastSerializer(podcast).data,
        "is_favorite": True,
    }

    favorite_item = FavoriteItem(user=user, item=podcast_episode)
    serializer = FavoriteItemSerializer(favorite_item)
    assert serializer.data.get("content_data") == {
        **PodcastEpisodeSerializer(podcast_episode).data,
        "is_favorite": True,
    }

    favorite_item = FavoriteItem(user=user, item=course_topic)
    serializer = FavoriteItemSerializer(favorite_item)
    with pytest.raises(Exception):
        assert serializer.data.get("content_data").get("id") == course_topic.id


@pytest.mark.parametrize(
    "factory,valid_type",
    [
        ["CourseFactory", True],
        ["ProgramFactory", True],
        ["StaffListFactory", True],
        ["VideoFactory", True],
        ["CourseTopicFactory", False],
    ],
)
def test_stafflist_generic_foreign_key_serializer_classes(factory, valid_type):
    """
    Test that generic foreign key serializer properly accepts expected classes and rejects others for staff lists
    """
    stafflist = StaffListFactory.create()
    obj = getattr(factories, factory).create()
    list_item = StaffListItem(staff_list=stafflist, item=obj)
    serializer = StaffListItemSerializer(list_item)
    if valid_type:
        assert serializer.data.get("content_data").get("id") == obj.id
    else:
        with pytest.raises(Exception):
            assert serializer.data.get("content_data").get("id") == obj.id


@pytest.mark.parametrize(
    "list_type,valid",
    [
        [StaffListType.LIST.value, True],
        [StaffListType.PATH.value, True],
        ["bad_type", False],
        [None, False],
    ],
)
def test_stafflist_serializer_validation(list_type, valid):
    """
    Test that the StaffListSerializer validates list_type and topics correctly
    """
    topics = CourseTopicFactory.create_batch(2)
    data = {
        "title": "My List",
        "list_type": list_type,
        "topics": [topic.id for topic in topics],
    }
    serializer = StaffListSerializer(data=data)
    assert serializer.is_valid() is valid
    data["topics"] = CourseTopicSerializer(instance=topics, many=True).data
    serializer = StaffListSerializer(data=data)
    assert serializer.is_valid() is valid


@pytest.mark.parametrize(
    "data, error",
    [
        [9999, "Invalid topic ids: {9999}"],
        [None, "Invalid topic ids: {None}"],
        ["a", "Topic ids must be integers"],
    ],
)
def test_stafflist_serializer_validation_bad_topic(data, error):
    """
    Test that the StaffListSerializer invalidates a non-existent topic
    """
    serializer_data = {
        "title": "My List",
        "list_type": StaffListType.PATH.value,
        "topics": [data],
    }
    serializer = StaffListSerializer(data=serializer_data)
    assert serializer.is_valid() is False
    assert serializer.errors["topics"][0] == error


@pytest.mark.parametrize("object_exists", [True, False])
@pytest.mark.parametrize(
    "content_type,factory,valid_type",
    [
        ["course", "CourseFactory", True],
        ["program", "ProgramFactory", True],
        ["video", "VideoFactory", True],
        ["userlist", "UserListFactory", False],
        [None, "CourseFactory", False],
    ],
)
def test_stafflistitem_serializer_validation(
    content_type, factory, valid_type, object_exists
):
    """
    Test that the StaffListItemSerializer validates content_type and object correctly
    """
    stafflist = StaffListFactory.create()
    # pylint:disable=redefined-builtin
    object_id = getattr(factories, factory).create().id if object_exists else 1_001_001
    data = {
        "content_type": content_type,
        "object_id": object_id,
        "staff_list": stafflist.id,
        "image_src": "https://test.edu/myimage.jpg",
    }
    serializer = StaffListItemSerializer(data=data)
    assert serializer.is_valid() == (valid_type and object_exists)


def test_podcast_serializer():
    """PodcastSerializer should generate relevant JSON for a given Podcast"""
    podcast = PodcastFactory.create()
    offered_by = LearningResourceOfferorFactory.create()
    podcast.offered_by.add(offered_by)

    assert PodcastSerializer(instance=podcast).data == {
        "full_description": podcast.full_description,
        "topics": CourseTopicSerializer(many=True, instance=podcast.topics).data,
        "url": podcast.url,
        "short_description": podcast.short_description,
        "podcast_id": podcast.podcast_id,
        "image_src": podcast.image_src,
        "offered_by": [offered_by.name],
        "title": podcast.title,
        "id": podcast.id,
        "lists": [],
        "object_type": "podcast",
        "published": True,
        "searchable": True,
        "platform": "podcast",
        "audience": ["Open Content"],
        "certification": [],
        "apple_podcasts_url": podcast.apple_podcasts_url,
        "google_podcasts_url": podcast.google_podcasts_url,
        "rss_url": podcast.rss_url,
    }


def test_podcast_episode_serializer():
    """PodcastEpisodeSerializer should generate relevant JSON for a given PodcastEpisode"""
    episode = PodcastEpisodeFactory.create()
    offered_by = LearningResourceOfferorFactory.create()
    episode.offered_by.add(offered_by)

    assert PodcastEpisodeSerializer(instance=episode).data == {
        "full_description": episode.full_description,
        "id": episode.id,
        "title": episode.title,
        "episode_id": episode.episode_id,
        "image_src": episode.image_src,
        "offered_by": [offered_by.name],
        "short_description": episode.short_description,
        "topics": CourseTopicSerializer(many=True, instance=episode.topics).data,
        "url": episode.url,
        "episode_link": episode.episode_link,
        "podcast": episode.podcast_id,
        "last_modified": episode.last_modified.strftime(datetime_format),
        "object_type": "podcastepisode",
        "podcast_title": episode.podcast.title,
        "transcript": "",
        "lists": [],
        "published": True,
        "searchable": True,
        "duration": None,
        "audience": ["Open Content"],
        "certification": [],
    }


def test_ocw_next_serializer(
    ocw_next_valid_data,
):  # pylint:disable=redefined-outer-name
    """OCWNextSerializer should generate a course with the correct data"""
    ocw_next_valid_data["uid"] = "97db384ef34009a64df7cb86cf701970"
    ocw_next_valid_data[
        "course_prefix"
    ] = "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/"
    ocw_serializer = OCWNextSerializer(data=ocw_next_valid_data, instance=None)
    assert ocw_serializer.is_valid()
    assert ocw_serializer.data == {
        "course_feature_tags": [
            "Lecture Videos",
            "Course Introduction",
            "Competition Videos",
            "Problem Sets with Solutions",
            "Exams with Solutions",
        ],
        "course_id": "97db384ef34009a64df7cb86cf701970+16.01",
        "department": ["16"],
        "extra_course_numbers": ["16.02", "16.03", "16.04", "17.01"],
        "image_description": "An abstracted aircraft wing with illustrated systems. (Image by MIT OCW.)",
        "image_src": "https://open-learning-course-data-production.s3.amazonaws.com/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/8f56bbb35d0e456dc8b70911bec7cd0d_16-01f05.jpg",
        "last_modified": None,
        "location": None,
        "object_type": "course",
        "ocw_next_course": True,
        "offered_by": None,
        "platform": "ocw",
        "program_name": None,
        "program_type": None,
        "published": True,
        "runs": None,
        "short_description": "The basic objective of Unified Engineering is to give a solid understanding of the fundamental disciplines of aerospace engineering, as well as their interrelationships and applications. These disciplines are Materials and Structures (M); Computers and Programming (C); Fluid Mechanics (F); Thermodynamics (T); Propulsion (P); and Signals and Systems (S). In choosing to teach these subjects in a unified manner, the instructors seek to explain the common intellectual threads in these disciplines, as well as their combined application to solve engineering Systems Problems (SP). Throughout the year, the instructors emphasize the connections among the disciplines",
        "title": "Unified Engineering I, II, III, & IV",
        "topics": None,
        "url": None,
    }
