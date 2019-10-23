"""Tests for elasticsearch serializers"""
# pylint: disable=redefined-outer-name,unused-argument
from datetime import datetime
import pytest

from channels.constants import POST_TYPE, COMMENT_TYPE, LINK_TYPE_SELF
from channels.factories.models import PostFactory, CommentFactory
from channels.utils import render_article_text
from course_catalog.constants import (
    OfferedBy,
    ListType,
    PrivacyLevel,
    LIST_TYPE_MAPPINGS,
)
from course_catalog.factories import (
    CourseFactory,
    LearningResourceRunFactory,
    CoursePriceFactory,
    ProgramFactory,
    UserListFactory,
    VideoResourceFactory,
)
from course_catalog.models import Course, VideoResource
from open_discussions.factories import UserFactory
from open_discussions.test_utils import drf_datetime, assert_json_equal
from profiles.models import Profile
from profiles.utils import image_uri, IMAGE_MEDIUM
from search.api import gen_course_id, gen_video_id
from search.constants import PROFILE_TYPE, COURSE_TYPE, PROGRAM_TYPE
from search.serializers import (
    ESPostSerializer,
    ESCommentSerializer,
    ESProgramSerializer,
    ESCourseSerializer,
    ESRunSerializer,
    ESProfileSerializer,
    ESCoursePriceSerializer,
    ESVideoSerializer,
    serialize_post_for_bulk,
    serialize_comment_for_bulk,
    serialize_bulk_comments,
    serialize_bulk_profiles,
    serialize_profile_for_bulk,
    serialize_bulk_courses,
    serialize_course_for_bulk,
    ESUserListSerializer,
    serialize_bulk_videos,
    serialize_video_for_bulk,
)


@pytest.fixture
def patched_base_post_serializer(mocker):
    """Fixture that patches the base serializer class for ESPostSerializer"""
    article_content = {"text": "hello world"}
    base_serialized_data = {
        "author_id": 1,
        "author_name": "Author Name",
        "author_headline": "Author Headline",
        "article_content": article_content,
        "plain_text": render_article_text(article_content),
        "profile_image": "/media/profile/1/208c7d959608417eb13bc87392cb5f77-2018-09-21T163449_small.jpg",
        "channel_title": "channel 1",
        "channel_name": "channel_1",
        "channel_type": "restricted",
        "post_type": LINK_TYPE_SELF,
        "text": "Post Text",
        "score": 1,
        "created": 123,
        "num_comments": 0,
        "removed": False,
        "deleted": False,
        "id": 1,
        "title": "post_title",
        "url": None,
        "thumbnail": None,
        "slug": "post-title",
    }
    yield mocker.patch(
        "search.serializers.ESPostSerializer.base_serializer",
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()),
    )


@pytest.fixture
def patched_base_comment_serializer(mocker):
    """Fixture that patches the base serializer class for ESCommentSerializer"""
    base_serialized_data = {
        "author_id": 1,
        "author_name": "Author Name",
        "author_headline": "Author Headline",
        "profile_image": "/media/profile/1/208c7d959608417eb13bc87392cb5f77-2018-09-21T163449_small.jpg",
        "text": "Comment Text",
        "score": 1,
        "created": 456,
        "removed": False,
        "deleted": False,
        "id": 1,
        "parent_id": 2,
    }
    yield mocker.patch(
        "search.serializers.ESCommentSerializer.base_serializer",
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()),
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "factory_kwargs",
    [{"is_article": True}, {"is_text": True}, {"is_link": True}, {"author": None}],
)
def test_es_post_serializer(factory_kwargs):
    """
    Test that ESPostSerializer correctly serializes a post object
    """
    post = PostFactory.create(**factory_kwargs)
    serialized = ESPostSerializer(instance=post).data
    assert serialized == {
        "object_type": POST_TYPE,
        "article_content": post.article.content
        if getattr(post, "article", None) is not None
        else None,
        "plain_text": post.plain_text,
        "author_id": post.author.username if post.author is not None else None,
        "author_name": post.author.profile.name if post.author is not None else None,
        "author_headline": post.author.profile.headline
        if post.author is not None
        else None,
        "author_avatar_small": image_uri(
            post.author.profile if post.author is not None else None
        ),
        "channel_name": post.channel.name,
        "channel_title": post.channel.title,
        "channel_type": post.channel.channel_type,
        "text": post.text,
        "score": post.score,
        "removed": post.removed,
        "created": drf_datetime(post.created_on),
        "deleted": post.deleted,
        "num_comments": post.num_comments,
        "post_id": post.post_id,
        "post_title": post.title,
        "post_link_url": post.url,
        "post_link_thumbnail": post.thumbnail_url,
        "post_slug": post.slug,
        "post_type": post.post_type,
    }


@pytest.mark.django_db
@pytest.mark.parametrize("has_author", [True, False])
def test_es_comment_serializer(has_author):
    """
    Test that ESCommentSerializer correctly serializes a comment object
    """
    comment = CommentFactory.create()
    serialized = ESCommentSerializer(instance=comment).data
    assert serialized == {
        "object_type": COMMENT_TYPE,
        "author_id": comment.author.username if comment.author is not None else None,
        "author_name": comment.author.profile.name
        if comment.author is not None
        else None,
        "author_headline": comment.author.profile.headline
        if comment.author is not None
        else None,
        "author_avatar_small": image_uri(
            comment.author.profile if comment.author is not None else None
        ),
        "text": comment.text,
        "score": comment.score,
        "removed": comment.removed,
        "created": drf_datetime(comment.created_on),
        "deleted": comment.deleted,
        "comment_id": comment.comment_id,
        "parent_comment_id": comment.parent_id,
        "channel_name": comment.post.channel.name,
        "channel_title": comment.post.channel.title,
        "channel_type": comment.post.channel.channel_type,
        "post_id": comment.post.post_id,
        "post_title": comment.post.title,
        "post_slug": comment.post.slug,
    }


def test_es_profile_serializer(mocker, user):
    """
    Test that ESProfileSerializer correctly serializes a profile object
    """
    mocker.patch(
        "search.serializers.get_channels", return_value={"channel01", "channel02"}
    )
    return_value = [("channel01", datetime.now()), ("channel02", datetime.now())]
    mocker.patch("search.serializers.get_channel_join_dates", return_value=return_value)
    serialized = ESProfileSerializer().serialize(user.profile)
    assert serialized == {
        "object_type": PROFILE_TYPE,
        "author_id": user.username,
        "author_name": user.profile.name,
        "author_avatar_small": image_uri(user.profile),
        "author_avatar_medium": image_uri(user.profile, IMAGE_MEDIUM),
        "author_bio": user.profile.bio,
        "author_headline": user.profile.headline,
        "author_channel_membership": ["channel01", "channel02"],
        "author_channel_join_data": [
            {"name": name, "joined": created_on} for name, created_on in return_value
        ],
    }


@pytest.mark.usefixtures("indexing_user")
@pytest.mark.django_db
def test_serialize_bulk_comments():
    """serialize_bulk_comments should index all comments it is passed"""
    comments = CommentFactory.create_batch(10)
    assert len(
        list(serialize_bulk_comments([comment.id for comment in comments]))
    ) == len(comments)


ISOFORMAT = "%Y-%m-%dT%H:%M:%SZ"


@pytest.mark.django_db
def test_es_course_price_serializer():
    """Test that the course price serializer serializes a price"""
    price = CoursePriceFactory.create()
    assert_json_equal(
        ESCoursePriceSerializer(price).data,
        {"price": f"{price.price:.2f}", "mode": price.mode},
    )


@pytest.mark.django_db
@pytest.mark.parametrize("has_full_name", [True, False])
def test_es_run_serializer(has_full_name):
    """
    Test that ESRunSerializer correctly serializes a run object
    """
    learning_resource_run = (
        LearningResourceRunFactory.create()
        if has_full_name
        else LearningResourceRunFactory.create(instructors__full_name=None)
    )
    serialized = ESRunSerializer(learning_resource_run).data

    assert_json_equal(
        serialized,
        {
            "id": learning_resource_run.id,
            "run_id": learning_resource_run.run_id,
            "short_description": learning_resource_run.short_description,
            "full_description": learning_resource_run.full_description,
            "language": learning_resource_run.language,
            "semester": learning_resource_run.semester,
            "year": int(learning_resource_run.year),
            "level": learning_resource_run.level,
            "start_date": learning_resource_run.start_date.strftime(ISOFORMAT),
            "end_date": learning_resource_run.end_date.strftime(ISOFORMAT),
            "enrollment_start": learning_resource_run.enrollment_start.strftime(
                ISOFORMAT
            ),
            "enrollment_end": learning_resource_run.enrollment_end.strftime(ISOFORMAT),
            "best_start_date": learning_resource_run.best_start_date,
            "best_end_date": learning_resource_run.best_end_date,
            "title": learning_resource_run.title,
            "image_src": learning_resource_run.image_src,
            "instructors": [
                (
                    instructor.full_name
                    if has_full_name
                    else " ".join([instructor.first_name, instructor.last_name])
                )
                for instructor in learning_resource_run.instructors.all()
            ],
            "prices": [
                ESCoursePriceSerializer(price).data
                for price in learning_resource_run.prices.all()
            ],
            "published": True,
            "availability": learning_resource_run.availability,
            "offered_by": list(
                learning_resource_run.offered_by.values_list("name", flat=True)
            ),
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("offered_by", [offered_by.value for offered_by in OfferedBy])
def test_es_course_serializer(offered_by):
    """
    Test that ESCourseSerializer correctly serializes a course object
    """
    course = CourseFactory.create(offered_by=offered_by)
    serialized = ESCourseSerializer(course).data
    assert_json_equal(
        serialized,
        {
            "object_type": COURSE_TYPE,
            "id": course.id,
            "course_id": course.course_id,
            "coursenum": course.course_id.split("+")[-1],
            "short_description": course.short_description,
            "full_description": course.full_description,
            "platform": course.platform,
            "title": course.title,
            "image_src": course.image_src,
            "topics": list(course.topics.values_list("name", flat=True)),
            "runs": [
                ESRunSerializer(course_run).data
                for course_run in course.runs.order_by("-best_start_date")
            ],
            "published": True,
            "offered_by": list(course.offered_by.values_list("name", flat=True)),
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("offered_by", [offered_by.value for offered_by in OfferedBy])
def test_es_program_serializer(offered_by):
    """
    Test that ESProgramSerializer correctly serializes a program object
    """
    program = ProgramFactory.create(offered_by=offered_by)
    serialized = ESProgramSerializer(program).data
    assert_json_equal(
        serialized,
        {
            "object_type": PROGRAM_TYPE,
            "id": program.id,
            "short_description": program.short_description,
            "title": program.title,
            "image_src": program.image_src,
            "topics": list(program.topics.values_list("name", flat=True)),
            "runs": [
                ESRunSerializer(program_run).data
                for program_run in program.runs.order_by("-best_start_date")
            ],
            "offered_by": list(program.offered_by.values_list("name", flat=True)),
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("list_type", [list_type.value for list_type in ListType])
@pytest.mark.parametrize("privacy_level", [privacy.value for privacy in PrivacyLevel])
def test_es_userlist_serializer(list_type, privacy_level, user):
    """
    Test that ESUserListSerializer correctly serializes a UserList object
    """
    user_list = UserListFactory.create(
        list_type=list_type, privacy_level=privacy_level, author=user
    )
    serialized = ESUserListSerializer(user_list).data
    assert_json_equal(
        serialized,
        {
            "author": user.id,
            "object_type": LIST_TYPE_MAPPINGS[list_type],
            "list_type": list_type,
            "privacy_level": privacy_level,
            "id": user_list.id,
            "short_description": user_list.short_description,
            "title": user_list.title,
            "image_src": user_list.image_src.url,
            "topics": list(user_list.topics.values_list("name", flat=True)),
        },
    )


def test_serialize_post_for_bulk(mocker):
    """
    Test that serialize_post_for_bulk correctly serializes a post/submission object
    """
    post_id = "post1"
    base_serialized_post = {"serialized": "post"}
    mocker.patch(
        "search.serializers.ESPostSerializer.to_representation",
        return_value=base_serialized_post,
    )
    serialized = serialize_post_for_bulk(mocker.Mock(post_id=post_id))
    assert serialized == {"_id": f"p_{post_id}", **base_serialized_post}


def test_serialize_comment_for_bulk(mocker):
    """
    Test that serialize_comment_for_bulk correctly serializes a comment object
    """
    comment_id = "456"
    base_serialized_comment = {"serialized": "comment"}
    mocker.patch(
        "search.serializers.ESCommentSerializer.to_representation",
        return_value=base_serialized_comment,
    )
    serialized = serialize_comment_for_bulk(mocker.Mock(comment_id=comment_id))
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
    list(serialize_bulk_profiles([profile.id for profile in Profile.objects.all()]))
    for user in users:
        mock_serialize_profile.assert_any_call(user.profile)


def test_serialize_profile_for_bulk(user):
    """
    Test that serialize_profile_for_bulk yields a valid ESProfileSerializer
    """
    assert serialize_profile_for_bulk(user.profile) == {
        "_id": "u_{}".format(user.username),
        **ESProfileSerializer().serialize(user.profile),
    }


@pytest.mark.django_db
def test_serialize_bulk_courses(mocker):
    """
    Test that serialize_bulk_courses calls serialize_course_for_bulk for every existing course
    """
    mock_serialize_course = mocker.patch("search.serializers.serialize_course_for_bulk")
    courses = CourseFactory.create_batch(5)
    list(serialize_bulk_courses([course.id for course in Course.objects.all()]))
    for course in courses:
        mock_serialize_course.assert_any_call(course)


@pytest.mark.django_db
def test_serialize_course_for_bulk():
    """
    Test that serialize_profile_for_bulk yields a valid ESProfileSerializer
    """
    course = CourseFactory.create()
    assert serialize_course_for_bulk(course) == {
        "_id": gen_course_id(course.platform, course.course_id),
        **ESCourseSerializer(course).data,
    }


@pytest.mark.django_db
def test_serialize_bulk_video(mocker):
    """
    Test that serialize_bulk_video calls serialize_video_for_bulk for every existing video
    """
    mock_serialize_video = mocker.patch("search.serializers.serialize_video_for_bulk")
    videos = VideoResourceFactory.create_batch(5)
    list(serialize_bulk_videos(VideoResource.objects.values_list("id", flat=True)))
    for video in videos:
        mock_serialize_video.assert_any_call(video)


@pytest.mark.django_db
def test_serialize_video_for_bulk():
    """
    Test that serialize_profile_for_bulk yields a valid ESProfileSerializer
    """
    video = VideoResourceFactory.create()
    assert serialize_video_for_bulk(video) == {
        "_id": gen_video_id(video),
        **ESVideoSerializer(video).data,
    }
