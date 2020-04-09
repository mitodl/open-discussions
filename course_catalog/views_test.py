"""Tests for course_catalog views"""
from types import SimpleNamespace
from datetime import datetime
import pytz

import pytest
import rapidjson

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from course_catalog.constants import PlatformType, ResourceType, PrivacyLevel, ListType
from course_catalog.exceptions import WebhookException
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    BootcampFactory,
    ProgramFactory,
    UserListFactory,
    UserListItemFactory,
    ProgramItemCourseFactory,
    ProgramItemBootcampFactory,
    VideoFactory,
    LearningResourceRunFactory,
    PodcastFactory,
    PodcastEpisodeFactory,
)
from course_catalog.models import UserList
from course_catalog.serializers import (
    CourseTopicSerializer,
    MicroUserListItemSerializer,
    PodcastSerializer,
    PodcastEpisodeSerializer,
)
from open_discussions import features
from open_discussions.factories import UserFactory

# pylint:disable=redefined-outer-name


OCW_WEBHOOK_RESPONSE = {
    "Records": [
        {
            "eventVersion": "2.1",
            "eventSource": "aws:s3",
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "OCW_Update",
                "bucket": {
                    "name": "test-bucket-1",
                    "ownerIdentity": {"principalId": "A123456789"},
                    "arn": "arn:aws:s3:::test-trigger-1",
                },
                "object": {
                    "key": "PROD/15/15.879/Spring_2014/15-879-research-seminar-in-system-dynamics-spring-2014/0/1.json",
                    "size": 20544,
                },
            },
        }
    ]
}


@pytest.fixture()
def mock_user_list_index(mocker):
    """Mocks index updating functions for user lists"""
    return SimpleNamespace(
        upsert_user_list=mocker.patch("course_catalog.serializers.upsert_user_list"),
        delete_user_list=mocker.patch("course_catalog.views.delete_user_list"),
        upsert_user_list_view=mocker.patch("course_catalog.views.upsert_user_list"),
        delete_empty_list=mocker.patch("course_catalog.serializers.delete_user_list"),
    )


def test_list_course_endpoint(client):
    """Test course endpoint"""
    course = CourseFactory.create()
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list"))
    assert resp.data.get("count") == 1
    assert resp.data.get("results")[0]["id"] == course.id


def test_get_course_endpoint(client):
    """Test course detail endpoint"""
    course = CourseFactory.create()

    resp = client.get(reverse("courses-detail", args=[course.id]))

    assert resp.data.get("course_id") == course.course_id


def test_new_courses_endpoint(client):
    """Test new courses endpoint"""
    course = CourseFactory.create()
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list") + "new/")

    assert resp.data.get("count") == 1
    assert resp.data.get("results")[0]["id"] == course.id


@pytest.mark.parametrize("featured", [True, False])
def test_featured_courses_endpoint(client, featured):
    """Test featured courses endpoint"""
    course = CourseFactory.create(featured=featured)
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list") + "featured/")

    assert resp.data.get("count") == (1 if featured else 0)
    if featured:
        assert resp.data.get("results")[0]["id"] == course.id


@pytest.mark.parametrize(
    "kwargs, is_upcoming", [({"in_future": True}, True), ({"in_past": True}, False)]
)
def test_upcoming_courses_endpoint(client, kwargs, is_upcoming):
    """Test upcoming courses endpoint"""
    course = CourseFactory.create(runs=None)
    LearningResourceRunFactory.create(content_object=course, **kwargs)
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list") + "upcoming/")

    assert resp.data.get("count") == (1 if is_upcoming else 0)
    if is_upcoming:
        assert resp.data.get("results")[0]["id"] == course.id


def test_course_detail_endpoint_lists(user_client, user):
    """Test that author's list ids are included"""
    course = CourseFactory.create()
    user_lists = UserListFactory.create_batch(3, author=user)
    list_items = sorted(
        [
            UserListItemFactory.create(content_object=course, user_list=user_list)
            for user_list in user_lists
        ],
        key=lambda x: x.id,
    )
    resp = user_client.get(reverse("courses-detail", args=[course.id]))
    assert sorted(resp.data.get("lists"), key=lambda x: x["item_id"]) == [
        MicroUserListItemSerializer(list_item).data for list_item in list_items
    ]


def test_bootcamp_endpoint(client):
    """Test bootcamp endpoint"""
    bootcamp = BootcampFactory.create()

    resp = client.get(reverse("bootcamps-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("bootcamps-detail", args=[bootcamp.id]))
    assert resp.data.get("course_id") == bootcamp.course_id


def test_bootcamp_detail_endpoint_lists(user_client, user):
    """Test that author's list ids are included"""
    bootcamp = BootcampFactory.create()
    user_lists = UserListFactory.create_batch(2, author=user)
    list_items = sorted(
        [
            UserListItemFactory.create(content_object=bootcamp, user_list=user_list)
            for user_list in user_lists
        ],
        key=lambda x: x.id,
    )
    resp = user_client.get(reverse("bootcamps-detail", args=[bootcamp.id]))
    assert sorted(resp.data.get("lists"), key=lambda x: x["item_id"]) == [
        MicroUserListItemSerializer(list_item).data for list_item in list_items
    ]


def test_program_endpoint(client):
    """Test program endpoint"""
    program = ProgramFactory.create()
    bootcamp_item = ProgramItemBootcampFactory.create(program=program, position=1)
    course_item = ProgramItemCourseFactory.create(program=program, position=2)

    resp = client.get(reverse("programs-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("programs-detail", args=[program.id]))
    assert resp.data.get("title") == program.title
    assert len(resp.data.get("lists")) == 0
    for item in resp.data.get("items"):
        if item.get("position") == 1:
            assert item.get("id") == bootcamp_item.id
        else:
            assert item.get("id") == course_item.id


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_get(client, is_public, is_author, user):
    """Test learning path endpoint"""
    author = UserFactory.create()
    user_list = UserListFactory.create(
        author=author,
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    another_user_list = UserListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    UserListItemFactory.create(user_list=user_list, position=1, is_bootcamp=True)
    UserListItemFactory.create(user_list=user_list, position=2)

    # Anonymous users should get no results
    resp = client.get(reverse("userlists-list"))
    assert resp.data.get("count") == 0

    # Logged in user should get own lists
    client.force_login(author if is_author else user)
    resp = client.get(reverse("userlists-list"))
    assert resp.data.get("count") == (1 if is_author else 0)
    if is_author:
        assert "content_data" not in resp.data.get("results")[0]

    resp = client.get(reverse("userlists-detail", args=[user_list.id]))
    assert resp.status_code == (403 if not (is_public or is_author) else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == user_list.title
        assert len(resp.data.get("lists")) == 0
        assert resp.data.get("item_count") == 2

    # Logged in user should see other person's public list
    resp = client.get(reverse("userlists-detail", args=[another_user_list.id]))
    assert resp.status_code == (403 if not is_public else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == another_user_list.title


@pytest.mark.parametrize("is_anonymous", [True, False])
def test_user_list_endpoint_create(client, is_anonymous, mock_user_list_index):
    """Test userlist endpoint for creating a UserList"""
    user = UserFactory.create()
    if not is_anonymous:
        client.force_login(user)

    data = {
        "title": "My List",
        "privacy_level": PrivacyLevel.public.value,
        "list_type": ListType.LEARNING_PATH.value,
    }

    resp = client.post(reverse("userlists-list"), data=data, format="json")
    assert resp.status_code == (403 if is_anonymous else 201)
    if resp.status_code == 201:
        assert resp.data.get("title") == resp.data.get("title")
        assert resp.data.get("author") == user.id
        mock_user_list_index.upsert_user_list.assert_not_called()


@pytest.mark.parametrize("update_topics", [True, False])
def test_user_list_endpoint_patch(client, user, mock_user_list_index, update_topics):
    """Test userlist endpoint for updating a UserList"""
    [original_topic, new_topic] = CourseTopicFactory.create_batch(2)
    userlist = UserListFactory.create(
        author=user, title="Title 1", topics=[original_topic]
    )
    UserListItemFactory.create(user_list=userlist)

    client.force_login(user)

    data = {"title": "Title 2"}
    if update_topics:
        data["topics"] = [new_topic.id]

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 200
    assert UserList.objects.get(id=userlist.id).title == "Title 2"
    assert resp.data["topics"][0]["id"] == (
        new_topic.id if update_topics else original_topic.id
    )
    mock_user_list_index.upsert_user_list.assert_called_once_with(userlist.id)


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_items_endpoint_create_item(
    client, user, is_author, mock_user_list_index
):
    """Test userlistitems endpoint for creating a UserListItem"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    client.force_login(author if is_author else user)

    data = {"content_type": "course", "object_id": course.id}

    resp = client.post(
        reverse("userlistitems-list", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (201 if is_author else 403)
    if resp.status_code == 201:
        assert resp.json().get("object_id") == course.id
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist.id)


def test_user_list_items_endpoint_create_item_bad_data(client, user):
    """Test userlistitems endpoint for creating a UserListItem"""
    userlist = UserListFactory.create(
        author=user, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    client.force_login(user)

    data = {"content_type": "bad_content", "object_id": course.id}

    resp = client.post(
        reverse("userlistitems-list", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 400
    assert resp.json() == {
        "non_field_errors": ["Incorrect object type bad_content"],
        "error_type": "ValidationError",
    }


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_items_endpoint_update_item(
    client, user, is_author, mock_user_list_index
):
    """Test userlistitems endpoint for updating UserListItem positions"""
    author = UserFactory.create()
    topics = CourseTopicFactory.create_batch(3)
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value, topics=topics
    )
    list_item_1 = UserListItemFactory.create(user_list=userlist, position=0)
    list_item_2 = UserListItemFactory.create(user_list=userlist, position=1)
    list_item_3 = UserListItemFactory.create(user_list=userlist, position=2)

    client.force_login(author if is_author else user)

    data = {"position": 0}

    resp = client.patch(
        reverse("userlistitems-detail", args=[userlist.id, list_item_3.id]),
        data=data,
        format="json",
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        assert resp.json()["position"] == 0
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist.id)
        for idx, item in enumerate([list_item_3, list_item_1, list_item_2]):
            item.refresh_from_db()
            assert item.position == idx


def test_user_list_items_endpoint_update_items_wrong_list(client, user):
    """Verify that trying an update via userlistitems api in wrong list fails"""
    userlist = UserListFactory.create(
        author=user, privacy_level=PrivacyLevel.public.value
    )
    list_item_incorrect = UserListItemFactory.create()

    client.force_login(user)

    data = {"id": list_item_incorrect.id, "position": 44}

    resp = client.patch(
        reverse("userlistitems-detail", args=[userlist.id, list_item_incorrect.id]),
        data=data,
        format="json",
    )
    assert resp.status_code == 404


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_items_endpoint_delete_items(
    client, user, is_author, mock_user_list_index
):
    """Test userlistitems endpoint for deleting UserListItems"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    list_items = sorted(
        UserListItemFactory.create_batch(2, user_list=userlist),
        key=lambda item: item.id,
    )

    client.force_login(author if is_author else user)

    resp = client.delete(
        reverse("userlistitems-detail", args=[userlist.id, list_items[0].id]),
        format="json",
    )
    assert resp.status_code == (204 if is_author else 403)
    if resp.status_code == 204:
        mock_user_list_index.upsert_user_list_view.assert_called_with(userlist.id)
        client.delete(
            reverse("userlistitems-detail", args=[userlist.id, list_items[1].id]),
            format="json",
        )
        mock_user_list_index.delete_user_list.assert_called_with(userlist)


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_delete(client, user, is_author, mock_user_list_index):
    """Test userlist endpoint for deleting a UserList"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )

    client.force_login(author if is_author else user)

    resp = client.delete(reverse("userlists-detail", args=[userlist.id]))
    assert resp.status_code == (204 if is_author else 403)
    assert UserList.objects.filter(id=userlist.id).exists() is not is_author
    assert mock_user_list_index.delete_user_list.call_count == (1 if is_author else 0)


@pytest.mark.usefixtures("transactional_db")
@pytest.mark.parametrize(
    "factory, route_name",
    [
        (CourseFactory, "courses-detail"),
        (ProgramFactory, "programs-detail"),
        (BootcampFactory, "bootcamps-detail"),
        (VideoFactory, "videos-detail"),
        (UserListFactory, "userlists-detail"),
    ],
)
def test_favorites(user_client, factory, route_name):
    """Test favoriting and unfavoriting"""
    # Test item is not favorited by default
    kwargs = (
        {"privacy_level": PrivacyLevel.public.value}
        if route_name == "userlists-detail"
        else {}
    )
    item = factory.create(**kwargs)
    path = reverse(route_name, args=[item.id])
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is False

    # Favorite course and test that it is favorited
    user_client.post(f"{path}favorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is True

    # Test that viewset gracefully handles favoriting an already favorited object
    user_client.post(f"{path}favorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is True

    # Test that course shows up in favorites endpoint
    resp = user_client.get(reverse("favorites-list"))
    assert resp.data.get("results")[0].get("content_data").get("id") == item.id

    # Unfavorite course and test that it is no longer favorited
    user_client.post(f"{path}unfavorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is False

    # Test that viewset gracefully handles unfavoriting an already unfavorited object
    user_client.post(f"{path}unfavorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is False


@pytest.mark.parametrize(
    "factory, route_name",
    [
        (CourseFactory, "courses-detail"),
        (ProgramFactory, "programs-detail"),
        (BootcampFactory, "bootcamps-detail"),
        (VideoFactory, "videos-detail"),
        (UserListFactory, "userlists-detail"),
    ],
)
def test_unautharized_favorites(client, factory, route_name):
    """Test favoriting and unfavoriting when not logged in"""
    kwargs = (
        {"privacy_level": PrivacyLevel.public.value}
        if route_name == "userlists-detail"
        else {}
    )
    item = factory.create(**kwargs)
    path = reverse(route_name, args=[item.id])
    resp = client.post(f"{path}favorite/")
    assert resp.status_code == 403

    resp = client.post(f"{path}unfavorite/")
    assert resp.status_code == 403


@pytest.mark.parametrize(
    "privacy_level", [PrivacyLevel.public.value, PrivacyLevel.private.value]
)
def test_favorite_lists_other_user(user_client, privacy_level):
    """Test favoriting and unfavoriting someone else's list"""
    is_public = privacy_level == PrivacyLevel.public.value
    userlist = UserListFactory.create(privacy_level=privacy_level)
    resp = user_client.post(
        reverse("userlists-detail", args=[userlist.id]) + "favorite/"
    )
    assert resp.status_code == 200 if is_public else 403

    resp = user_client.post(
        reverse("userlists-detail", args=[userlist.id]) + "unfavorite/"
    )
    assert resp.status_code == 200 if is_public else 403


def test_course_report(client):
    """Test ocw course report"""
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=False,
    )
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=True,
        image_src="",
    )
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=True,
        image_src="abc123",
    )
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.ocw_resource.value,
        published=False,
    )

    username = "test_user"
    password = "test_password"
    User.objects.create_user(username=username, password=password)
    client.login(username=username, password=password)
    resp = client.get(reverse("ocw-course-report"))
    assert resp.data == {
        "total_number_of_ocw_courses": 3,
        "published_ocw_courses_with_image": 2,
        "unpublished_ocw_courses": 1,
        "ocw_courses_without_image": 1,
        "ocw_resources": 1,
    }


def test_topic_endpoint(client):
    """Test topic endpoint"""
    topics = CourseTopicFactory.create_batch(5)

    resp = client.get(reverse("topics-list"))
    assert resp.data.get("count") == 5

    topic = topics[0]
    resp = client.get(reverse("topics-detail", args=[topic.id]))
    assert resp.data == CourseTopicSerializer(topic).data


def test_video_endpoint(client):
    """Test video endpoint"""
    video1 = VideoFactory.create(last_modified=datetime(2019, 10, 4, tzinfo=pytz.utc))
    video2 = VideoFactory.create(last_modified=datetime(2019, 10, 6, tzinfo=pytz.utc))
    video3 = VideoFactory.create(last_modified=datetime(2019, 10, 5, tzinfo=pytz.utc))

    resp = client.get(reverse("videos-list"))
    assert resp.data.get("count") == 3
    assert list(map(lambda video: video["id"], resp.data.get("results"))) == [
        video1.id,
        video2.id,
        video3.id,
    ]

    resp = client.get(reverse("videos-list") + "new/")
    assert resp.data.get("count") == 3
    assert list(map(lambda video: video["id"], resp.data.get("results"))) == [
        video2.id,
        video3.id,
        video1.id,
    ]

    resp = client.get(reverse("videos-detail", args=[video1.id]))
    assert resp.data.get("video_id") == video1.video_id


@pytest.mark.parametrize("webhook_enabled", [True, False])
@pytest.mark.parametrize("data", [OCW_WEBHOOK_RESPONSE, {}, {"foo": "bar"}])
def test_ocw_webhook_endpoint(client, mocker, settings, webhook_enabled, data):
    """Test that the OCW webhook endpoint schedules a get_ocw_courses task"""
    settings.FEATURES[features.WEBHOOK_OCW] = webhook_enabled
    settings.OCW_WEBHOOK_KEY = "fake_key"
    mock_get_ocw = mocker.patch(
        "course_catalog.views.get_ocw_courses.apply_async", autospec=True
    )
    mock_log = mocker.patch("course_catalog.views.log.error")
    mocker.patch("course_catalog.views.load_course_blacklist", return_value=[])
    client.post(
        f"{reverse('ocw-webhook')}?webhook_key={settings.OCW_WEBHOOK_KEY}",
        data=data,
        headers={"Content-Type": "text/plain"},
    )
    if webhook_enabled and data == OCW_WEBHOOK_RESPONSE:
        mock_get_ocw.assert_called_once_with(
            countdown=settings.OCW_WEBHOOK_DELAY,
            kwargs={
                "course_prefixes": [
                    OCW_WEBHOOK_RESPONSE["Records"][0]["s3"]["object"]["key"].split(
                        "0/1.json"
                    )[0]
                ],
                "blacklist": [],
                "force_overwrite": False,
                "upload_to_s3": True,
            },
        )
    else:
        mock_get_ocw.assert_not_called()
        mock_log.assert_called_once_with(
            "No records found in webhook: %s", rapidjson.dumps(data)
        )


@pytest.mark.parametrize(
    "data",
    [
        None,
        "notjson",
        {"Records": [{"foo": "bar"}]},
        {"Records": [{"s3": {"object": {"bucket": "test-bucket-1"}}}]},
    ],
)
def test_ocw_webhook_endpoint_bad_data(mocker, settings, client, data):
    """Test that a webhook exception is raised if bad data is sent"""
    mocker.patch("course_catalog.views.load_course_blacklist", return_value=[])
    settings.FEATURES[features.WEBHOOK_OCW] = True
    settings.OCW_WEBHOOK_KEY = "fake_key"
    with pytest.raises(WebhookException):
        client.post(
            f"{reverse('ocw-webhook')}?webhook_key={settings.OCW_WEBHOOK_KEY}",
            data=f"{data}".encode(),
            headers={"Content-Type": "text/plain"},
        )


def test_ocw_webhook_endpoint_bad_key(settings, client):
    """Test that a webhook exception is raised if a bad key is sent"""
    settings.FEATURES[features.WEBHOOK_OCW] = True
    settings.OCW_WEBHOOK_KEY = "fake_key"
    with pytest.raises(WebhookException):
        client.post(
            f"{reverse('ocw-webhook')}?webhook_key=invalid_key",
            data=OCW_WEBHOOK_RESPONSE,
            headers={"Content-Type": "text/plain"},
        )


def test_podcasts_no_feature_flag(settings, client):
    """If the feature flag is set to false the end user should get a 403"""
    settings.FEATURES[features.PODCAST_APIS] = False
    resp = client.get(reverse("podcasts-list"))
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_podcasts(settings, client):
    """Podcasts API should return serialized podcast data"""
    podcasts = sorted(PodcastFactory.create_batch(2), key=lambda p: p.id)
    for podcast in podcasts:
        PodcastEpisodeFactory.create_batch(2, podcast=podcast)

    # Make sure these get filtered out
    PodcastFactory.create(published=False)
    PodcastEpisodeFactory.create(published=False, podcast__published=False)

    settings.FEATURES[features.PODCAST_APIS] = True
    resp = client.get(reverse("podcasts-list"))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == PodcastSerializer(instance=podcasts, many=True).data


def test_recent_podcast_episodes_no_feature_flag(settings, client):
    """Recent podcast episodes API should return a 403 if the feature flag is not set"""
    settings.FEATURES[features.PODCAST_APIS] = False
    resp = client.get(reverse("recent-podcast-episodes"))
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_recent_podcast_episodes(settings, client):
    """Recent podcast episodes API should return recent serialized podcast episodes in order of most recent first"""
    episodes = reversed(
        sorted(
            PodcastEpisodeFactory.create_batch(5),
            key=lambda episode: (episode.last_modified, episode.id),
        )
    )

    settings.FEATURES[features.PODCAST_APIS] = True
    resp = client.get(reverse("recent-podcast-episodes"))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["count"] == 5
    assert (
        resp.json()["results"]
        == PodcastEpisodeSerializer(instance=episodes, many=True).data
    )
