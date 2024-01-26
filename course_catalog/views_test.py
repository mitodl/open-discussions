"""Tests for course_catalog views"""
from datetime import datetime, timedelta
from operator import itemgetter

import pytest
import pytz
import rapidjson
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from course_catalog.constants import PlatformType, PrivacyLevel, ResourceType
from course_catalog.exceptions import WebhookException
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    LearningResourceRunFactory,
    PodcastEpisodeFactory,
    PodcastFactory,
    ProgramFactory,
    ProgramItemCourseFactory,
    UserListFactory,
    UserListItemFactory,
    VideoFactory,
)
from course_catalog.serializers import (
    CourseTopicSerializer,
    MicroUserListItemSerializer,
    PodcastEpisodeSerializer,
    PodcastSerializer,
)
from open_discussions import features

# pylint:disable=redefined-outer-name, use-maxsplit-arg


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


def test_program_endpoint(client):
    """Test program endpoint"""
    program = ProgramFactory.create()
    course_item_1 = ProgramItemCourseFactory.create(program=program, position=1)
    course_item_2 = ProgramItemCourseFactory.create(program=program, position=2)

    resp = client.get(reverse("programs-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("programs-detail", args=[program.id]))
    assert resp.data.get("title") == program.title
    assert len(resp.data.get("lists")) == 0
    items = sorted(resp.data.get("items"), key=lambda i: i["id"])
    assert items[0].get("id") == course_item_1.id
    assert items[1].get("id") == course_item_2.id


@pytest.mark.usefixtures("transactional_db")
@pytest.mark.parametrize(
    "factory, route_name",
    [
        (CourseFactory, "courses-detail"),
        (ProgramFactory, "programs-detail"),
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
    assert sorted(
        list(map(lambda video: video["id"], resp.data.get("results")))
    ) == sorted(
        [
            video1.id,
            video2.id,
            video3.id,
        ]
    )

    resp = client.get(reverse("videos-list") + "new/")
    assert resp.data.get("count") == 3
    assert sorted(
        list(map(lambda video: video["id"], resp.data.get("results")))
    ) == sorted(
        [
            video2.id,
            video3.id,
            video1.id,
        ]
    )

    resp = client.get(reverse("videos-detail", args=[video1.id]))
    assert resp.data.get("video_id") == video1.video_id


@pytest.mark.parametrize("data", [OCW_WEBHOOK_RESPONSE, {}, {"foo": "bar"}])
def test_ocw_webhook_endpoint(client, mocker, settings, data):
    """Test that the OCW webhook endpoint schedules a get_ocw_courses task"""
    settings.OCW_WEBHOOK_KEY = "fake_key"
    mock_get_ocw = mocker.patch(
        "course_catalog.views.get_ocw_courses.apply_async", autospec=True
    )
    mock_log = mocker.patch("course_catalog.views.log.error")
    mocker.patch("course_catalog.views.load_course_blocklist", return_value=[])
    client.post(
        f"{reverse('ocw-webhook')}?webhook_key={settings.OCW_WEBHOOK_KEY}",
        data=data,
        headers={"Content-Type": "text/plain"},
    )
    if data == OCW_WEBHOOK_RESPONSE:
        mock_get_ocw.assert_called_once_with(
            countdown=settings.OCW_WEBHOOK_DELAY,
            kwargs={
                "course_prefixes": [
                    OCW_WEBHOOK_RESPONSE["Records"][0]["s3"]["object"]["key"].split(
                        "0/1.json"
                    )[0]
                ],
                "blocklist": [],
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
    mocker.patch("course_catalog.views.load_course_blocklist", return_value=[])
    settings.OCW_WEBHOOK_KEY = "fake_key"
    with pytest.raises(WebhookException):
        client.post(
            f"{reverse('ocw-webhook')}?webhook_key={settings.OCW_WEBHOOK_KEY}",
            data=f"{data}".encode(),
            headers={"Content-Type": "text/plain"},
        )


def test_ocw_webhook_endpoint_bad_key(settings, client):
    """Test that a webhook exception is raised if a bad key is sent"""
    settings.OCW_WEBHOOK_KEY = "fake_key"
    with pytest.raises(WebhookException):
        client.post(
            f"{reverse('ocw-webhook')}?webhook_key=invalid_key",
            data=OCW_WEBHOOK_RESPONSE,
            headers={"Content-Type": "text/plain"},
        )


@pytest.mark.parametrize(
    "data",
    [
        {"webhook_key": "fake_key", "prefix": "prefix1", "version": "live"},
        {"webhook_key": "fake_key", "prefix": "prefix2", "version": "draft"},
        {"webhook_key": "fake_key", "prefixes": "prefix1, prefix2", "version": "live"},
        {"webhook_key": "fake_key", "prefixes": "prefix2", "version": "live"},
        {
            "webhook_key": "fake_key",
            "prefixes": ["prefix1", "prefix2"],
            "version": "live",
        },
        {"webhook_key": "fake_key", "version": "live"},
    ],
)
def test_ocw_webhook_endpoint(client, mocker, settings, data):
    """Test that the OCW webhook endpoint schedules a get_ocw_courses task"""
    settings.OCW_NEXT_SEARCH_WEBHOOK_KEY = "fake_key"
    mock_get_ocw = mocker.patch(
        "course_catalog.views.get_ocw_next_courses.delay", autospec=True
    )
    response = client.post(
        reverse("ocw-next-webhook"),
        data=data,
        headers={"Content-Type": "text/plain"},
    )

    prefix = data.get("prefix")
    prefixes = data.get("prefixes")

    expected_prefixes = [prefix] if prefix else prefixes
    if isinstance(expected_prefixes, str):
        expected_prefixes = [prefix.strip() for prefix in expected_prefixes.split(",")]

    if expected_prefixes and data.get("version") == "live":
        mock_get_ocw.assert_called_once_with(
            url_paths=expected_prefixes, force_overwrite=False
        )
        assert response.status_code == 200
        assert (
            response.data["message"]
            == f"OCW courses queued for indexing: {expected_prefixes}"
        )
    else:
        mock_get_ocw.assert_not_called()
        if data.get("version") != "live":
            assert response.data["message"] == "Not a live version, ignoring"
            assert response.status_code == 200
        else:
            assert (
                response.data["message"]
                == f"Could not determine appropriate action from request: {data}"
            )
            assert response.status_code == 400


@pytest.mark.parametrize(
    "data",
    [
        {"site_uid": "254605fe779d5edd86f55a421e82b544", "version": "live"},
        {
            "site_uid": "254605fe779d5edd86f55a421e82b544",
            "version": "live",
            "unpublished": True,
        },
        {
            "site_uid": "254605fe779d5edd86f55a421e82b544",
            "version": "draft",
            "unpublished": True,
        },
        {"site_uid": None, "version": "live", "unpublished": True},
    ],
)
@pytest.mark.parametrize("run_exists", [True, False])
def test_ocw_next_webhook_endpoint_unpublished(
    client, mocker, settings, data, run_exists
):
    """Test that the OCW webhook endpoint removes an unpublished task from the search index"""
    settings.OCW_NEXT_SEARCH_WEBHOOK_KEY = "fake_key"
    mock_delete_course = mocker.patch(
        "course_catalog.views.deindex_course", autospec=True
    )
    run_id = data.get("site_uid")
    course_run = None
    if run_id and run_exists:
        course_run = LearningResourceRunFactory.create(
            run_id=run_id, platform=PlatformType.ocw.value
        )
    response = client.post(
        reverse("ocw-next-webhook"),
        data={"webhook_key": "fake_key", **data},
        headers={"Content-Type": "text/plain"},
    )

    if (
        data.get("site_uid")
        and data.get("unpublished") is True
        and data.get("version") == "live"
    ):
        assert response.status_code == 200
        if run_exists:
            mock_delete_course.assert_called_once_with(course_run.content_object)
            assert (
                response.data["message"]
                == f"OCW course {run_id} queued for unpublishing"
            )
        else:
            assert (
                response.data["message"]
                == f"OCW course {run_id} not found, so nothing to unpublish"
            )
    else:
        mock_delete_course.assert_not_called()


def test_ocw_next_webhook_endpoint_bad_key(settings, client):
    """Test that a webhook exception is raised if a bad key is sent"""
    settings.OCW_NEXT_SEARCH_WEBHOOK_KEY = "fake_key"
    with pytest.raises(WebhookException):
        client.post(
            reverse("ocw-next-webhook"),
            data={"webhook_key": "bad_key", "prefix": "prefix", "version": "live"},
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

    # Make sure this gets filtered out
    PodcastFactory.create(published=False)
    # A published podcast with an unpublished episode should still be shown
    empty_podcast = PodcastEpisodeFactory.create(
        published=False, podcast__published=True
    ).podcast

    settings.FEATURES[features.PODCAST_APIS] = True
    resp = client.get(reverse("podcasts-list"))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == sorted(
        [
            {"episode_count": 2, "is_favorite": False, **podcast}
            for podcast in PodcastSerializer(instance=podcasts, many=True).data
        ]
        + [
            {
                "episode_count": 0,
                "is_favorite": False,
                **PodcastSerializer(instance=empty_podcast).data,
            }
        ],
        key=lambda _podcast: _podcast["id"],
    )


def test_recent_podcast_episodes_no_feature_flag(settings, client):
    """Recent podcast episodes API should return a 403 if the feature flag is not set"""
    settings.FEATURES[features.PODCAST_APIS] = False
    for basename in ["recent-podcast-episodes", "podcastepisodes-list"]:
        resp = client.get(reverse(basename))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_podcast_episodes(settings, client):
    """
    Podcast episodes and tecent podcast episodes APIs should return recent serialized podcast episodes in order of most recent first.
    Recent podcast episodes API should limit to only one episode per podcast
    """
    latest_episodes_by_podcast = PodcastEpisodeFactory.create_batch(5)

    older_episode = PodcastEpisodeFactory.create(
        podcast=latest_episodes_by_podcast[0].podcast,
        last_modified=latest_episodes_by_podcast[0].last_modified - timedelta(days=10),
    )

    # Make sure these don't get counted
    PodcastEpisodeFactory.create(published=False)
    PodcastEpisodeFactory.create(published=True, podcast__published=False)

    settings.FEATURES[features.PODCAST_APIS] = True
    for basename in ["recent-podcast-episodes", "podcastepisodes-list"]:
        if basename == "recent-podcast-episodes":
            episodes = latest_episodes_by_podcast
            count = 5
        else:
            episodes = latest_episodes_by_podcast + [older_episode]
            count = 6

        episodes = list(
            reversed(
                sorted(
                    episodes, key=lambda episode: (episode.last_modified, episode.id)
                )
            )
        )

        resp = client.get(reverse(basename))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["count"] == count

        expected_results = [
            {"is_favorite": False, **episode}
            for episode in PodcastEpisodeSerializer(instance=episodes, many=True).data
        ]

        results = resp.json()["results"]

        for result in expected_results:
            result["topics"] = sorted(result["topics"], key=itemgetter("id"))

        for result in results:
            result["topics"] = sorted(result["topics"], key=itemgetter("id"))

        assert results == expected_results


def test_podcast_episodes_detail_no_feature_flag(settings, client):
    """Podcast episodes API should show the detail view for an episode"""
    episode = PodcastEpisodeFactory.create()

    settings.FEATURES[features.PODCAST_APIS] = False
    resp = client.get(reverse("podcastepisodes-detail", kwargs={"pk": episode.id}))
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_podcast_episodes_detail(settings, client):
    """Podcast episodes API should show the detail view for an episode"""
    episode = PodcastEpisodeFactory.create()

    settings.FEATURES[features.PODCAST_APIS] = True
    resp = client.get(reverse("podcastepisodes-detail", kwargs={"pk": episode.id}))
    expected_data = PodcastEpisodeSerializer(instance=episode).data
    expected_data["is_favorite"] = False
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == expected_data


def test_episodes_per_podcast_no_feature_flag(settings, client):
    """Recent podcast episodes API should return a 403 if the feature flag is not set"""
    settings.FEATURES[features.PODCAST_APIS] = False
    resp = client.get(reverse("episodes-in-podcast", kwargs={"pk": 234}))
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_episodes_per_podcast(settings, client):
    """This view should list all published episodes for a given podcast id"""
    podcast = PodcastFactory.create()

    episodes = reversed(
        sorted(
            PodcastEpisodeFactory.create_batch(5, podcast=podcast),
            key=lambda episode: (episode.last_modified, episode.id),
        )
    )
    # Make sure these aren't included
    PodcastEpisodeFactory.create_batch(5)
    PodcastEpisodeFactory.create(podcast=podcast, published=False)

    settings.FEATURES[features.PODCAST_APIS] = True
    resp = client.get(reverse("episodes-in-podcast", kwargs={"pk": podcast.id}))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "count": 5,
        "results": PodcastEpisodeSerializer(instance=episodes, many=True).data,
        "next": None,
        "previous": None,
    }

    podcast.published = False
    podcast.save()
    resp = client.get(reverse("episodes-in-podcast", kwargs={"pk": podcast.id}))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"count": 0, "results": [], "next": None, "previous": None}
