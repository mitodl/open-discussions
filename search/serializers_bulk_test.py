"""Tests for elasticsearch bulk serializers"""

import pytest

from course_catalog import factories
from course_catalog.constants import PrivacyLevel
from course_catalog.models import Course, StaffList, Video
from open_discussions.factories import UserFactory
from open_discussions.test_utils import assert_json_equal
from profiles.models import Profile
from search import api, serializers


def test_serialize_post_for_bulk(mocker):
    """
    Test that serialize_post_for_bulk correctly serializes a post/submission object
    """
    post_id = "post1"
    base_serialized_post = {"serialized": "post"}
    mocker.patch(
        "search.serializers.OSPostSerializer.to_representation",
        return_value=base_serialized_post,
    )
    serialized = serializers.serialize_post_for_bulk(mocker.Mock(post_id=post_id))
    assert serialized == {"_id": f"p_{post_id}", **base_serialized_post}


def test_serialize_comment_for_bulk(mocker):
    """
    Test that serialize_comment_for_bulk correctly serializes a comment object
    """
    comment_id = "456"
    base_serialized_comment = {"serialized": "comment"}
    mocker.patch(
        "search.serializers.OSCommentSerializer.to_representation",
        return_value=base_serialized_comment,
    )
    serialized = serializers.serialize_comment_for_bulk(
        mocker.Mock(comment_id=comment_id)
    )
    assert serialized == {"_id": f"c_{comment_id}", **base_serialized_comment}


@pytest.mark.django_db
def test_serialize_bulk_profiles(mocker):
    """
    Test that serialize_bulk_profiles calls serialize_profile_for_bulk for every existing profile
    """
    mock_serialize_profile = mocker.patch(
        "search.serializers.serialize_profile_for_bulk"
    )
    users = UserFactory.create_batch(5)
    list(
        serializers.serialize_bulk_profiles(
            [profile.id for profile in Profile.objects.all()]
        )
    )
    for user in users:
        mock_serialize_profile.assert_any_call(user.profile)


def test_serialize_profile_for_bulk(user):
    """
    Test that serialize_profile_for_bulk yields a valid ESProfileSerializer
    """
    assert serializers.serialize_profile_for_bulk(user.profile) == {
        "_id": "u_{}".format(user.username),
        **serializers.ESProfileSerializer().serialize(user.profile),
    }


@pytest.mark.django_db
def test_serialize_bulk_courses(mocker):
    """
    Test that serialize_bulk_courses calls serialize_course_for_bulk for every existing course
    """
    mock_serialize_course = mocker.patch("search.serializers.serialize_course_for_bulk")
    courses = factories.CourseFactory.create_batch(5)
    list(
        serializers.serialize_bulk_courses(
            [course.id for course in Course.objects.all()]
        )
    )
    for course in courses:
        mock_serialize_course.assert_any_call(course)


@pytest.mark.django_db
def test_serialize_course_for_bulk():
    """
    Test that serialize_course_for_bulk yields a valid OSCourseSerializer
    """
    course = factories.CourseFactory.create()
    assert_json_equal(
        serializers.serialize_course_for_bulk(course),
        {
            "_id": api.gen_course_id(course.platform, course.course_id),
            **serializers.OSCourseSerializer(course).data,
        },
    )


@pytest.mark.django_db
def test_serialize_bulk_staff_lists(mocker):
    """
    Test that serialize_bulk_staff_lists calls serialize_staff_list_for_bulk for every existing public StaffList
    """
    mock_serialize_staff_list = mocker.patch(
        "search.serializers.serialize_staff_list_for_bulk"
    )
    staff_lists = factories.StaffListFactory.create_batch(
        3, privacy_level=PrivacyLevel.public.value
    )
    for staff_list in staff_lists:
        factories.StaffListItemFactory.create(staff_list=staff_list)
    list(
        serializers.serialize_bulk_staff_lists(
            [staff_list.id for staff_list in StaffList.objects.all()]
        )
    )
    for staff_list in staff_lists:
        mock_serialize_staff_list.assert_any_call(staff_list)


@pytest.mark.django_db
def test_serialize_staff_list_for_bulk():
    """
    Test that serialize_staff_list_for_bulk yields a valid OSStaffListSerializer
    """
    staff_list = factories.StaffListFactory.create()
    factories.StaffListItemFactory.create(staff_list=staff_list)
    assert_json_equal(
        serializers.serialize_staff_list_for_bulk(staff_list),
        {
            "_id": api.gen_staff_list_id(staff_list),
            **serializers.OSStaffListSerializer(staff_list).data,
        },
    )


@pytest.mark.django_db
def test_serialize_bulk_video(mocker):
    """
    Test that serialize_bulk_video calls serialize_video_for_bulk for every existing video
    """
    mock_serialize_video = mocker.patch("search.serializers.serialize_video_for_bulk")
    videos = factories.VideoFactory.create_batch(5)
    list(serializers.serialize_bulk_videos(Video.objects.values_list("id", flat=True)))
    for video in videos:
        mock_serialize_video.assert_any_call(video)


@pytest.mark.django_db
def test_serialize_video_for_bulk():
    """
    Test that serialize_video_for_bulk yields a valid OSVideoSerializer
    """
    video = factories.VideoFactory.create()
    assert serializers.serialize_video_for_bulk(video) == {
        "_id": api.gen_video_id(video),
        **serializers.OSVideoSerializer(video).data,
    }


@pytest.mark.django_db
def test_serialize_content_file_for_bulk():
    """
    Test that serialize_content_file_for_bulk yields a valid OSContentFileSerializer
    """
    content_file = factories.ContentFileFactory.create()
    assert serializers.serialize_content_file_for_bulk(content_file) == {
        "_id": api.gen_content_file_id(content_file.key),
        **serializers.OSContentFileSerializer(content_file).data,
    }


@pytest.mark.django_db
def test_serialize_content_file_for_bulk_deletion():
    """
    Test that serialize_content_file_for_bulk_deletion yields a valid OSContentFileSerializer
    """
    content_file = factories.ContentFileFactory.create()
    assert serializers.serialize_content_file_for_bulk_deletion(content_file) == {
        "_id": api.gen_content_file_id(content_file.key),
        "_op_type": "delete",
    }


@pytest.mark.django_db
def test_serialize_bulk_podcasts(mocker):
    """
    Test that serialize_bulk_podcasts calls serialize_podcast_for_bulk for every existing podcast
    """
    mock_serialize_podcast = mocker.patch(
        "search.serializers.serialize_podcast_for_bulk"
    )
    podcasts = factories.PodcastFactory.create_batch(5)
    list(serializers.serialize_bulk_podcasts([podcast.id for podcast in podcasts]))
    for podcast in podcasts:
        mock_serialize_podcast.assert_any_call(podcast)


@pytest.mark.django_db
def test_serialize_podcast_for_bulk():
    """
    Test that serialize_podcast_for_bulk yields a valid OSPodcastSerializer
    """
    podcast = factories.PodcastFactory.create()
    assert serializers.serialize_podcast_for_bulk(podcast) == {
        "_id": api.gen_podcast_id(podcast),
        **serializers.OSPodcastSerializer(podcast).data,
    }


@pytest.mark.django_db
def test_serialize_bulk_podcast_episodes(mocker):
    """
    Test that serialize_bulk_podcast_episodes calls serialize_podcast_episode_for_bulk for every existing
    podcast episode
    """
    mock_serialize_podcast_episode = mocker.patch(
        "search.serializers.serialize_podcast_episode_for_bulk"
    )
    podcast_episodes = factories.PodcastEpisodeFactory.create_batch(5)
    list(
        serializers.serialize_bulk_podcast_episodes(
            [podcast_episode.id for podcast_episode in podcast_episodes]
        )
    )
    for podcast_episode in podcast_episodes:
        mock_serialize_podcast_episode.assert_any_call(podcast_episode)


@pytest.mark.django_db
def test_serialize_podcast_episode_for_bulk():
    """
    Test that serialize_podcast_episode_for_bulk yields a valid OSPodcastEpisodeSerializer
    """
    podcast_episode = factories.PodcastEpisodeFactory.create()
    assert serializers.serialize_podcast_episode_for_bulk(podcast_episode) == {
        "_id": api.gen_podcast_episode_id(podcast_episode),
        **serializers.OSPodcastEpisodeSerializer(podcast_episode).data,
    }


@pytest.mark.django_db
def test_serialize_profiles_file_for_bulk_deletion(user):
    """
    Test that serialize_profiles_file_for_bulk_deletion yield correct data
    """
    assert list(
        serializers.serialize_bulk_profiles_for_deletion([user.profile.id])
    ) == [{"_id": api.gen_profile_id(user.username), "_op_type": "delete"}]


@pytest.mark.django_db
def test_serialize_bulk_courses_for_deletion():
    """
    Test that serialize_bulk_courses_for_deletion yields correct data
    """
    course = factories.CourseFactory.create()
    assert list(serializers.serialize_bulk_courses_for_deletion([course.id])) == [
        {
            "_id": api.gen_course_id(course.platform, course.course_id),
            "_op_type": "delete",
        }
    ]


@pytest.mark.django_db
def test_serialize_bulk_programs_for_deletion():
    """
    Test that serialize_bulk_programs_for_deletion yields correct data
    """
    program = factories.ProgramFactory.create()
    assert list(serializers.serialize_bulk_programs_for_deletion([program.id])) == [
        {"_id": api.gen_program_id(program), "_op_type": "delete"}
    ]


@pytest.mark.django_db
def test_serialize_bulk_user_lists_for_deletion():
    """
    Test that serialize_bulk_user_lists_for_deletion yields correct data
    """
    userlist = factories.UserListFactory.create()
    assert list(serializers.serialize_bulk_user_lists_for_deletion([userlist.id])) == [
        {"_id": api.gen_user_list_id(userlist), "_op_type": "delete"}
    ]


@pytest.mark.django_db
def test_serialize_bulk_staff_lists_for_deletion():
    """
    Test that serialize_bulk_user_lists_for_deletion yields correct data
    """
    stafflist = factories.StaffListFactory.create()
    assert list(
        serializers.serialize_bulk_staff_lists_for_deletion([stafflist.id])
    ) == [{"_id": api.gen_staff_list_id(stafflist), "_op_type": "delete"}]


@pytest.mark.django_db
def test_serialize_bulk_videos_for_deletion():
    """
    Test that serialize_bulk_videos_for_deletion yields correct data
    """
    video = factories.VideoFactory.create()
    assert list(serializers.serialize_bulk_videos_for_deletion([video.id])) == [
        {"_id": api.gen_video_id(video), "_op_type": "delete"}
    ]


@pytest.mark.django_db
def test_serialize_bulk_podcasts_for_deletion():
    """
    Test that serialize_bulk_podcasts_for_deletion yields correct data
    """
    podcast = factories.PodcastFactory.create()
    assert list(serializers.serialize_bulk_podcasts_for_deletion([podcast.id])) == [
        {"_id": api.gen_podcast_id(podcast), "_op_type": "delete"}
    ]


@pytest.mark.django_db
def test_serialize_bulk_podcast_episodes_for_deletion():
    """
    Test that serialize_bulk_podcasts_for_deletion yields correct data
    """
    podcast_episode = factories.PodcastEpisodeFactory.create()
    assert list(
        serializers.serialize_bulk_podcast_episodes_for_deletion([podcast_episode.id])
    ) == [{"_id": api.gen_podcast_episode_id(podcast_episode), "_op_type": "delete"}]
