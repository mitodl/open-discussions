"""Tests for elasticsearch serializers"""
from datetime import datetime
# pylint: disable=redefined-outer-name,unused-argument
from functools import reduce

import pytest

from channels.constants import COMMENT_TYPE, LINK_TYPE_SELF, POST_TYPE
from channels.factories.models import CommentFactory, PostFactory
from channels.utils import render_article_text
from course_catalog import factories
from course_catalog.constants import (
    AvailabilityType,
    OfferedBy,
    PlatformType,
    PrivacyLevel,
    StaffListType,
    UserListType,
)
from course_catalog.models import (
    PROFESSIONAL_COURSE_PLATFORMS,
    ContentType,
    Course,
    Program,
)
from open_discussions.constants import ISOFORMAT
from open_discussions.test_utils import assert_json_equal, drf_datetime
from profiles.utils import IMAGE_MEDIUM, image_uri
from search import api, constants, serializers


def minimum_price(learning_resource):
    """Function for calculating the minimum price of a learning resource across runs"""

    prices = [
        run.prices.values_list("price", flat=True)
        for run in learning_resource.runs.all()
    ]

    minimum = min(reduce(lambda x, y: x | y, prices), default=0)
    return f"{minimum:.2f}"


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
    serialized = serializers.ESPostSerializer(instance=post).data
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
    serialized = serializers.ESCommentSerializer(instance=comment).data
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
    serialized = serializers.ESProfileSerializer().serialize(user.profile)
    assert serialized == {
        "object_type": constants.PROFILE_TYPE,
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
        list(serializers.serialize_bulk_comments([comment.id for comment in comments]))
    ) == len(comments)


@pytest.mark.django_db
def test_es_course_price_serializer():
    """Test that the course price serializer serializes a price"""
    price = factories.CoursePriceFactory.create()
    assert_json_equal(
        serializers.ESCoursePriceSerializer(price).data,
        {"price": f"{price.price:.2f}", "mode": price.mode},
    )


@pytest.mark.django_db
@pytest.mark.parametrize("has_full_name", [True, False])
@pytest.mark.parametrize("level", ["Undergraduate", "Undergraduate, Graduate"])
def test_es_run_serializer(has_full_name, level):
    """
    Test that ESRunSerializer correctly serializes a run object
    """
    learning_resource_run = (
        factories.LearningResourceRunFactory.create()
        if has_full_name
        else factories.LearningResourceRunFactory.create(instructors__full_name=None)
    )
    learning_resource_run.level = level
    learning_resource_run.save()
    serialized = serializers.ESRunSerializer(learning_resource_run).data

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
            "level": level.split(", "),
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
                serializers.ESCoursePriceSerializer(price).data
                for price in learning_resource_run.prices.all()
            ],
            "published": True,
            "availability": learning_resource_run.availability,
            "offered_by": list(
                learning_resource_run.offered_by.values_list("name", flat=True)
            ),
            "slug": learning_resource_run.slug,
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("offered_by", [offered_by.value for offered_by in OfferedBy])
@pytest.mark.parametrize("platform", [platform.value for platform in PlatformType])
@pytest.mark.parametrize("department", [None, ["2"]])
def test_es_course_serializer(offered_by, platform, department):
    """
    Test that ESCourseSerializer correctly serializes a course object
    """
    course = factories.CourseFactory.create(platform=platform, department=department)

    if platform == PlatformType.ocw.value:
        course.course_id = "sfsdfsdf+2.11"
        course.extra_course_numbers = ["12.11"]
        course.save()
        expected_department_course_numbers = [
            {
                "coursenum": "2.11",
                "department": "Mechanical Engineering",
                "primary": True,
                "sort_coursenum": "02.11",
            },
            {
                "coursenum": "12.11",
                "department": "Earth, Atmospheric, and Planetary Sciences",
                "primary": False,
                "sort_coursenum": "12.11",
            },
        ]
    else:
        expected_department_course_numbers = []

    unpublished_run = course.runs.first()
    unpublished_run.published = False
    unpublished_run.save()
    course.offered_by.set([factories.LearningResourceOfferorFactory(name=offered_by)])

    serialized = serializers.ESCourseSerializer(course).data

    if platform in PROFESSIONAL_COURSE_PLATFORMS:
        expected_audience = ["Professional Offerings"]
    else:
        expected_audience = ["Open Content"]

    if platform in PROFESSIONAL_COURSE_PLATFORMS or (
        platform == PlatformType.mitx.value
        and any(
            availability != AvailabilityType.archived.value
            for availability in course.runs.values_list("availability", flat=True)
        )
    ):
        expected_certification = ["Certificates"]
    else:
        expected_certification = []

    if department == ["2"]:
        expected_department_name = ["Mechanical Engineering"]
    else:
        expected_department_name = []

    assert_json_equal(
        serialized,
        {
            "object_type": constants.COURSE_TYPE,
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
                serializers.ESRunSerializer(course_run).data
                for course_run in course.runs.exclude(published=False).order_by(
                    "-best_start_date"
                )
            ],
            "published": True,
            "offered_by": [offered_by],
            "created": drf_datetime(course.created_on),
            "default_search_priority": 1,
            "minimum_price": minimum_price(course),
            "resource_relations": {"name": "resource"},
            "audience": expected_audience,
            "certification": expected_certification,
            "department_name": expected_department_name,
            "department_slug": course.department_slug,
            "course_feature_tags": course.course_feature_tags,
            "department_course_numbers": expected_department_course_numbers,
        },
        sort=True,
    )
    assert len(serialized["runs"]) == 2


@pytest.mark.django_db
@pytest.mark.parametrize(
    "section,section_resource_type",
    [
        ["First Paper Assignment", constants.OCW_TYPE_ASSIGNMENTS],
        ["Assignment 1.2", constants.OCW_TYPE_ASSIGNMENTS],
        ["Assignments and Exams", None],
        ["Lecture Summaries", constants.OCW_TYPE_LECTURE_NOTES],
        [constants.OCW_TYPE_LECTURE_NOTES, constants.OCW_TYPE_LECTURE_NOTES],
        ["Resources", None],
        ["Exercises", None],
    ],
)
@pytest.mark.parametrize("ocw_next_course", [True, False])
def test_es_content_file_serializer(section, section_resource_type, ocw_next_course):
    """Verify that the ESContentFileSerializer has the correct data"""
    content_kwargs = {
        "content": "Some text",
        "content_author": "MIT",
        "content_language": "en",
        "content_title": "test title",
        "section": section,
    }
    content_file = factories.ContentFileFactory.create(**content_kwargs)
    course = content_file.run.content_object
    course.ocw_next_course = ocw_next_course
    course.save()

    if ocw_next_course:
        resource_type = content_file.learning_resource_types
    else:
        resource_type = section_resource_type

    serialized = serializers.ESContentFileSerializer(content_file).data

    assert_json_equal(
        serialized,
        {
            "object_type": constants.RESOURCE_FILE_TYPE,
            "run_id": content_file.run.run_id,
            "run_title": content_file.run.title,
            "run_slug": content_file.run.slug,
            "run_department_slug": content_file.run.content_object.department_slug,
            "semester": content_file.run.semester,
            "year": int(content_file.run.year),
            "topics": list(
                content_file.run.content_object.topics.values_list("name", flat=True)
            ),
            "key": content_file.key,
            "uid": content_file.uid,
            "resource_relations": {
                "name": "resourcefile",
                "parent": api.gen_course_id(
                    content_file.run.content_object.platform,
                    content_file.run.content_object.course_id,
                ),
            },
            "title": content_file.title,
            "short_description": content_file.description,
            "file_type": content_file.file_type,
            "content_type": content_file.content_type,
            "url": content_file.url,
            "short_url": content_file.short_url,
            "section": content_file.section,
            "section_slug": content_file.section_slug,
            "content": content_kwargs["content"],
            "content_title": content_kwargs["content_title"],
            "content_author": content_kwargs["content_author"],
            "content_language": content_kwargs["content_language"],
            "image_src": content_file.image_src,
            "course_id": content_file.run.content_object.course_id,
            "coursenum": content_file.run.content_object.coursenum,
            "resource_type": resource_type,
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("offered_by", [offered_by.value for offered_by in OfferedBy])
def test_es_program_serializer(offered_by):
    """
    Test that ESProgramSerializer correctly serializes a program object
    """
    program = factories.ProgramFactory.create()
    program.offered_by.set([factories.LearningResourceOfferorFactory(name=offered_by)])

    serialized = serializers.ESProgramSerializer(program).data

    if offered_by == OfferedBy.micromasters.value:
        expected_audience = ["Open Content", "Professional Offerings"]
    else:
        expected_audience = ["Professional Offerings"]

    assert_json_equal(
        serialized,
        {
            "object_type": constants.PROGRAM_TYPE,
            "id": program.id,
            "short_description": program.short_description,
            "title": program.title,
            "image_src": program.image_src,
            "topics": list(program.topics.values_list("name", flat=True)),
            "runs": [
                serializers.ESRunSerializer(program_run).data
                for program_run in program.runs.order_by("-best_start_date")
            ],
            "offered_by": [offered_by],
            "created": drf_datetime(program.created_on),
            "default_search_priority": 1,
            "minimum_price": minimum_price(program),
            "audience": expected_audience,
            "certification": ["Certificates"],
        },
    )


def expected_audience_for_list(user_list):
    """
    The exprcted value of the serialized audience filter field for a user list
    """
    for list_item in user_list.items.all():
        if list_item.content_type == ContentType.objects.get_for_model(Course):
            if list_item.item.platform in PROFESSIONAL_COURSE_PLATFORMS:
                return []
        elif list_item.content_type == ContentType.objects.get_for_model(Program):
            if (
                OfferedBy.micromasters.value
                not in list_item.item.offered_by.values_list("name", flat=True)
            ):
                return []

    return ["Open Content"]


@pytest.mark.django_db
@pytest.mark.parametrize("list_type", [list_type.value for list_type in UserListType])
@pytest.mark.parametrize("privacy_level", [privacy.value for privacy in PrivacyLevel])
def test_es_userlist_serializer(list_type, privacy_level, user):
    """
    Test that ESUserListSerializer correctly serializes a UserList object
    """
    user_list = factories.UserListFactory.create(
        list_type=list_type, privacy_level=privacy_level, author=user
    )
    serialized = serializers.ESUserListSerializer(user_list).data
    assert_json_equal(
        serialized,
        {
            "author": user.id,
            "object_type": list_type,
            "list_type": list_type,
            "privacy_level": privacy_level,
            "id": user_list.id,
            "short_description": user_list.short_description,
            "title": user_list.title,
            "image_src": user_list.image_src.url,
            "topics": list(user_list.topics.values_list("name", flat=True)),
            "created": drf_datetime(user_list.created_on),
            "default_search_priority": 0,
            "minimum_price": 0,
            "certification": [],
            "audience": expected_audience_for_list(user_list),
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("list_type", [list_type.value for list_type in StaffListType])
@pytest.mark.parametrize(
    "privacy_level", [PrivacyLevel.public.value, PrivacyLevel.private.value]
)
def test_es_stafflist_serializer(list_type, privacy_level, user):
    """
    Test that ESStaffListSerializer correctly serializes a StaffList object
    """
    staff_list = factories.StaffListFactory.create(
        list_type=list_type, privacy_level=privacy_level, author=user
    )
    serialized = serializers.ESStaffListSerializer(staff_list).data
    assert_json_equal(
        serialized,
        {
            "author": user.id,
            "object_type": constants.STAFF_LIST_TYPE,
            "list_type": list_type,
            "privacy_level": privacy_level,
            "id": staff_list.id,
            "short_description": staff_list.short_description,
            "title": staff_list.title,
            "image_src": staff_list.image_src.url,
            "topics": list(staff_list.topics.values_list("name", flat=True)),
            "created": drf_datetime(staff_list.created_on),
            "default_search_priority": 0,
            "minimum_price": 0,
            "certification": [],
            "audience": expected_audience_for_list(staff_list),
        },
    )


@pytest.mark.django_db
def test_es_userlist_serializer_image_src():
    """
    Test that ESUserListSerializer uses 1st non-list list item image_src if the list image_src is None
    """
    user_list = factories.UserListFactory.create(image_src=None)
    factories.UserListItemFactory.create(
        user_list=user_list, position=1, is_userlist=True
    )
    list_item_course = factories.UserListItemFactory.create(
        user_list=user_list, position=2, is_course=True
    )

    serialized = serializers.ESUserListSerializer(user_list).data
    assert_json_equal(
        serialized,
        {
            "author": user_list.author.id,
            "object_type": user_list.list_type,
            "list_type": user_list.list_type,
            "privacy_level": user_list.privacy_level,
            "id": user_list.id,
            "short_description": user_list.short_description,
            "title": user_list.title,
            "image_src": list_item_course.item.image_src,
            "topics": list(user_list.topics.values_list("name", flat=True)),
            "created": drf_datetime(user_list.created_on),
            "default_search_priority": 0,
            "minimum_price": 0,
            "certification": [],
            "audience": expected_audience_for_list(user_list),
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("offered_by", [offered_by.value for offered_by in OfferedBy])
def test_es_podcast_serializer(offered_by):
    """
    Test that ESPodcastSerializer correctly serializes a Podcast object
    """
    podcast = factories.PodcastFactory.create()
    podcast.offered_by.set([factories.LearningResourceOfferorFactory(name=offered_by)])

    serialized = serializers.ESPodcastSerializer(podcast).data
    assert_json_equal(
        serialized,
        {
            "object_type": constants.PODCAST_TYPE,
            "id": podcast.id,
            "podcast_id": podcast.podcast_id,
            "short_description": podcast.short_description,
            "full_description": podcast.full_description,
            "title": podcast.title,
            "url": podcast.url,
            "image_src": podcast.image_src,
            "topics": list(podcast.topics.values_list("name", flat=True)),
            "created": drf_datetime(podcast.created_on),
            "default_search_priority": 0,
            "offered_by": [offered_by],
            "audience": ["Open Content"],
            "certification": [],
            "apple_podcasts_url": podcast.apple_podcasts_url,
            "google_podcasts_url": podcast.google_podcasts_url,
            "rss_url": podcast.rss_url,
        },
    )


@pytest.mark.django_db
@pytest.mark.parametrize("offered_by", [offered_by.value for offered_by in OfferedBy])
def test_es_podcast_episode_serializer(offered_by):
    """
    Test that ESPodcastEpisodeSerializer correctly serializes a PodcastEpisode object
    """
    podcast_episode = factories.PodcastEpisodeFactory.create()
    podcast_episode.offered_by.set(
        [factories.LearningResourceOfferorFactory(name=offered_by)]
    )

    serialized = serializers.ESPodcastEpisodeSerializer(podcast_episode).data
    assert_json_equal(
        serialized,
        {
            "object_type": constants.PODCAST_EPISODE_TYPE,
            "id": podcast_episode.id,
            "podcast_id": podcast_episode.podcast.id,
            "series_title": podcast_episode.podcast.title,
            "episode_id": podcast_episode.episode_id,
            "short_description": podcast_episode.short_description,
            "full_description": podcast_episode.full_description,
            "title": podcast_episode.title,
            "url": podcast_episode.url,
            "duration": podcast_episode.duration,
            "last_modified": drf_datetime(podcast_episode.last_modified),
            "image_src": podcast_episode.image_src,
            "topics": list(podcast_episode.topics.values_list("name", flat=True)),
            "created": drf_datetime(podcast_episode.created_on),
            "default_search_priority": 0,
            "offered_by": [offered_by],
            "audience": ["Open Content"],
            "certification": [],
        },
    )
