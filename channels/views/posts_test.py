"""Tests for views for REST APIs for posts"""
# pylint: disable=unused-argument,too-many-lines,redefined-outer-name
import json
import os
from types import SimpleNamespace
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.request import Request

from profiles.utils import image_uri
from channels.factories.models import LinkMetaFactory
from channels.constants import (
    EXTENDED_POST_TYPE_ARTICLE,
    VALID_POST_SORT_TYPES,
    POSTS_SORT_HOT,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
)
from channels.models import Subscription, LinkMeta, Article
from channels.views.test_utils import (
    default_post_response_data,
    raise_error_on_submission_fetch,
    raise_error_on_subreddit_fetch,
)
from open_discussions.constants import (
    NOT_AUTHENTICATED_ERROR_TYPE,
    PERMISSION_DENIED_ERROR_TYPE,
    DJANGO_PERMISSION_ERROR_TYPES,
)
from open_discussions.factories import UserFactory
from open_discussions.test_utils import any_instance_of

pytestmark = pytest.mark.betamax


@pytest.fixture(autouse=True)
def mock_spam_check(mocker):
    """Mock the check_comment_for_spam task"""
    return mocker.patch("channels.task_helpers.check_post_for_spam")


def test_create_url_post_existing_meta(
    user_client, private_channel_and_contributor, mocker, settings
):
    """
    Create a new url post
    """
    settings.EMBEDLY_KEY = "FAKE"
    channel, user = private_channel_and_contributor
    link_url = "http://micromasters.mit.edu/🐨"
    thumbnail = "http://fake/thumb.jpg"
    embedly_stub = mocker.patch("channels.utils.get_embedly_summary")
    LinkMetaFactory.create(url=link_url, thumbnail=thumbnail)
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    resp = user_client.post(url, {"title": "url title 🐨", "url": link_url})
    embedly_stub.assert_not_called()
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "title": "url title 🐨",
        "post_type": LINK_TYPE_LINK,
        "url": link_url,
        "url_domain": "micromasters.mit.edu",
        "cover_image": None,
        "thumbnail": thumbnail,
        "text": None,
        "article_content": None,
        "plain_text": None,
        "author_id": user.username,
        "created": any_instance_of(str),
        "upvoted": True,
        "id": any_instance_of(str),
        "slug": "url-title",
        "num_comments": 0,
        "removed": False,
        "deleted": False,
        "subscribed": True,
        "score": 1,
        "channel_name": channel.name,
        "channel_title": channel.title,
        "channel_type": channel.channel_type,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        "num_reports": None,
    }


def test_post_create_post_new_meta(
    user_client, private_channel_and_contributor, mocker, settings
):
    """Tests that a new LinkMeta object is created for the URL if none exists"""
    settings.EMBEDLY_KEY = "FAKE"
    channel, _ = private_channel_and_contributor
    link_url = "http://fake"
    thumbnail = "http://fake/thumbnail.jpg"
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(
        **{"json.return_value": {"some": "json", "thumbnail_url": thumbnail}}
    )
    embedly_stub = mocker.patch(
        "channels.utils.get_embedly_summary", return_value=embed_return_value
    )
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    user_client.post(url, {"title": "url title 🐨", "url": link_url})
    embedly_stub.assert_called_with(link_url)
    assert LinkMeta.objects.filter(url=link_url).first() is not None


def test_post_create_post_no_thumbnail(
    user_client, private_channel_and_contributor, mocker, settings
):
    """Tests that no LinkMeta object is created if embedly does not return a thumbnail"""
    settings.EMBEDLY_KEY = "FAKE"
    channel, _ = private_channel_and_contributor
    link_url = "http://fake"
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{"json.return_value": {"some": "json"}})
    embedly_stub = mocker.patch(
        "channels.utils.get_embedly_summary", return_value=embed_return_value
    )
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    user_client.post(url, {"title": "url title 🐨", "url": link_url})
    embedly_stub.assert_called_once_with(link_url)
    assert LinkMeta.objects.filter(url=url).first() is None


def test_create_text_post(
    user_client, private_channel_and_contributor, mock_spam_check
):
    """
    Create a new text post
    """
    channel, user = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    resp = user_client.post(
        url, {"title": "parameterized testing", "text": "tests are great"}
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "title": "parameterized testing",
        "text": "tests are great",
        "article_content": None,
        "plain_text": "tests are great",
        "url": None,
        "url_domain": None,
        "cover_image": None,
        "thumbnail": None,
        "author_id": user.username,
        "created": any_instance_of(str),
        "upvoted": True,
        "removed": False,
        "deleted": False,
        "subscribed": True,
        "id": any_instance_of(str),
        "slug": "parameterized-testing",
        "num_comments": 0,
        "score": 1,
        "channel_name": channel.name,
        "channel_title": channel.title,
        "channel_type": channel.channel_type,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        "num_reports": None,
        "post_type": LINK_TYPE_SELF,
    }
    mock_spam_check.assert_called_with(any_instance_of(Request), resp.json()["id"])


def test_create_article_post(
    user_client, private_channel_and_contributor, mock_spam_check
):
    """
    Create a new article post
    """
    channel, user = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    article_text = "some text"
    article_content = [{"key": "value", "nested": {"number": 4}, "text": article_text}]
    resp = user_client.post(
        url, {"title": "parameterized testing", "article_content": article_content}
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "title": "parameterized testing",
        "text": "",
        "article_content": article_content,
        "plain_text": article_text,
        "url": None,
        "url_domain": None,
        "cover_image": None,
        "thumbnail": None,
        "author_id": user.username,
        "created": any_instance_of(str),
        "upvoted": True,
        "removed": False,
        "deleted": False,
        "subscribed": True,
        "id": any_instance_of(str),
        "slug": "parameterized-testing",
        "num_comments": 0,
        "score": 1,
        "channel_name": channel.name,
        "channel_title": channel.title,
        "channel_type": "private",
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        "num_reports": None,
        "post_type": EXTENDED_POST_TYPE_ARTICLE,
    }
    article = Article.objects.filter(post__post_id=resp.json()["id"])
    assert article.exists()
    assert article.first().content == article_content
    mock_spam_check.assert_called_with(any_instance_of(Request), resp.json()["id"])


def test_create_and_update_post_moderator(
    user_client, private_channel_and_contributor, mock_spam_check, staff_api
):
    """
    Create and update a post as a moderator
    """
    channel, user = private_channel_and_contributor
    staff_api.add_moderator(user.username, channel.name)

    url = reverse("post-list", kwargs={"channel_name": channel.name})
    resp = user_client.post(
        url, {"title": "parameterized testing", "text": "tests are great"}
    )
    assert resp.status_code == status.HTTP_201_CREATED

    url = reverse("post-detail", kwargs={"post_id": resp.json()["id"]})
    resp = user_client.patch(url, {"date": {"text": "updated"}})
    assert resp.status_code == status.HTTP_200_OK

    mock_spam_check.assert_not_called()


def test_create_article_post_with_cover(user_client, private_channel_and_contributor):
    """
    Create a new article post with a cover image
    """
    channel, _ = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    article_content = [{"key": "value", "nested": {"number": 4}}]
    png_file = os.path.join(
        os.path.dirname(__file__), "..", "..", "static", "images", "avatar_default.png"
    )
    with open(png_file, "rb") as f:
        resp = user_client.post(
            url,
            {
                "title": "parameterized testing",
                "article_content": json.dumps(article_content),
                "cover_image": f,
            },
            format="multipart",
        )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["article_content"] == article_content
    article = Article.objects.get(post__post_id=resp.json()["id"])
    assert resp.json()["cover_image"].endswith(article.cover_image.url)
    assert len(article.cover_image.read()) == os.path.getsize(png_file)


def test_patch_article_validate_cover_image(
    user_client, private_channel_and_contributor
):
    """
    It should error if the cover image is not a file
    """
    channel, _ = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    article_content = [{"key": "value", "nested": {"number": 4}}]
    resp = user_client.post(
        url,
        {
            "title": "parameterized testing",
            "article_content": json.dumps(article_content),
            "cover_image": b"test",
        },
        format="multipart",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json() == {
        "error_type": "ValidationError",
        "cover_image": ["Expected cover image to be a file or url"],
    }


def test_create_text_post_blank(user_client, private_channel_and_contributor):
    """
    Create a new text post with no text
    """
    channel, _ = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    resp = user_client.post(url, {"title": "blank post"})
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["text"] == ""


def test_create_post_forbidden(user_client, private_channel):
    """
    Create a new text post for a channel the user doesn't have permission to
    """
    url = reverse("post-list", kwargs={"channel_name": private_channel.name})
    resp = user_client.post(
        url, {"title": "parameterized testing", "text": "tests are great"}
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_post_not_found(client, logged_in_profile):
    """
    Create a new text post for a channel that doesn't exist
    """
    url = reverse("post-list", kwargs={"channel_name": "doesnt_exist"})
    resp = client.post(
        url, {"title": "parameterized testing", "text": "tests are great"}
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_create_post_anonymous(client):
    """
    Anonymous users can't create posts
    """
    url = reverse("post-list", kwargs={"channel_name": "doesnt_matter"})
    resp = client.post(
        url, {"title": "parameterized testing", "text": "tests are great"}
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


@pytest.mark.parametrize("missing_user", [True, False])
def test_get_deleted_post(
    staff_client, missing_user, private_channel_and_contributor, reddit_factories
):
    """Get an existing post for a deleted user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("deleted", user, channel=channel)

    if missing_user:
        user.username = "renamed"
        user.save()

    url = reverse("post-detail", kwargs={"post_id": post.id})
    resp = staff_client.get(url)
    if missing_user:
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    else:
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.parametrize(
    "client_user, expected_status",
    [
        [None, status.HTTP_404_NOT_FOUND],
        [pytest.lazy_fixture("user"), status.HTTP_404_NOT_FOUND],
        [pytest.lazy_fixture("staff_user"), status.HTTP_200_OK],
    ],
)
def test_get_removed_post(
    client,
    user,
    public_channel,
    reddit_factories,
    staff_api,
    client_user,
    expected_status,
):  # pylint: disable=too-many-arguments
    """Get an existing post for a removed post"""
    post = reddit_factories.text_post("removed", user, channel=public_channel)

    staff_api.remove_post(post.id)

    if client_user is not None:
        client.force_login(client_user)

    url = reverse("post-detail", kwargs={"post_id": post.id})
    resp = client.get(url)

    assert resp.status_code == expected_status


# pylint: disable=too-many-arguments
@pytest.mark.parametrize("missing_image", [True, False])
def test_get_post(
    user_client, private_channel_and_contributor, reddit_factories, missing_image
):
    """Get an existing post with no image"""
    channel, user = private_channel_and_contributor

    if missing_image:
        user.profile.image_small = None
    else:
        user.profile.image_small = "/just/a/great/image.png.jpg.gif"
    user.profile.save()

    post = reddit_factories.text_post("my geat post", user, channel=channel)
    url = reverse("post-detail", kwargs={"post_id": post.id})
    resp = user_client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == default_post_response_data(channel, post, user)


def test_get_post_no_profile(
    user_client, private_channel_and_contributor, reddit_factories
):
    """Get an existing post for a user with no profile"""
    channel, user = private_channel_and_contributor
    user.profile.delete()

    post = reddit_factories.text_post("my geat post", user, channel=channel)
    url = reverse("post-detail", kwargs={"post_id": post.id})
    resp = user_client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        **default_post_response_data(channel, post, user),
        "author_name": "[deleted]",
        "author_headline": None,
        "profile_image": image_uri(None),
    }


def test_get_post_forbidden(client, logged_in_profile):
    """Get a post the user doesn't have permission to"""
    post_id = "adc"
    url = reverse("post-detail", kwargs={"post_id": post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_post_not_found(client, logged_in_profile):
    """Get a post the user doesn't have permission to"""
    post_id = "missing"
    url = reverse("post-detail", kwargs={"post_id": post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_post_stickied(
    user_client, private_channel_and_contributor, reddit_factories, staff_api
):
    """test that stickied posts come back that way"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("just a post", user, channel=channel)
    staff_api.pin_post(post.id, True)
    url = reverse("post-detail", kwargs={"post_id": post.id})
    get_resp = user_client.get(url)
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json() == {
        **default_post_response_data(channel, post, user),
        "stickied": True,
    }


def test_get_post_anonymous(client, public_channel, reddit_factories):
    """Anonymous users can see posts for a public channel, if the feature flag is set"""
    user = UserFactory.create(username="01CBFJMB9PD3JP17KAX3E5JQ46")
    post = reddit_factories.link_post("link_post", user=user, channel=public_channel)

    url = reverse("post-detail", kwargs={"post_id": post.id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        **default_post_response_data(public_channel, post, user),
        "upvoted": False,
    }


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_posts(
    mocker, user_client, missing_user, private_channel_and_contributor, reddit_factories
):
    """List posts in a channel"""
    channel, user = private_channel_and_contributor
    posts = list(
        reversed(
            [
                reddit_factories.link_post("link_post", user=user, channel=channel),
                reddit_factories.text_post("text_post", user=user, channel=channel),
            ]
        )
    )

    if missing_user:
        user.username = "renamed"
        user.save()

    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK

    if missing_user:
        # all posts should be filtered out
        assert resp.json() == {"posts": [], "pagination": {"sort": POSTS_SORT_HOT}}
    else:
        assert resp.json() == {
            "posts": [
                default_post_response_data(channel, post, user) for post in posts
            ],
            "pagination": {"sort": POSTS_SORT_HOT},
        }


def test_list_posts_none(mocker, user_client, private_channel_and_contributor):
    """List posts in a channel"""
    channel, _ = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"posts": [], "pagination": {"sort": POSTS_SORT_HOT}}


@pytest.mark.parametrize("sort", VALID_POST_SORT_TYPES)
def test_list_posts_sorted(
    mocker, user_client, private_channel_and_contributor, reddit_factories, sort
):
    """View the channel listing with sorted options"""
    # note: these sort types are difficult to reproduce unique sort orders in the span of a test,
    #       so we're just checking that the APIs don't error
    channel, user = private_channel_and_contributor
    first_post = reddit_factories.text_post("my post", user, channel=channel)
    second_post = reddit_factories.text_post("my 2nd post", user, channel=channel)
    third_post = reddit_factories.text_post("my 3rd post", user, channel=channel)
    fourth_post = reddit_factories.text_post("my 4th post", user, channel=channel)
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url, {"sort": sort})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "posts": [
            default_post_response_data(channel, post, user)
            for post in [fourth_post, third_post, second_post, first_post]
        ],
        "pagination": {"sort": sort},
    }


def test_list_posts_stickied(
    mocker, user_client, private_channel_and_contributor, reddit_factories, staff_api
):
    """test that the stickied post is first"""
    channel, user = private_channel_and_contributor
    posts = [
        reddit_factories.text_post("great post!{}".format(i), user, channel=channel)
        for i in range(4)
    ]
    post = posts[2]
    staff_api.pin_post(post.id, True)
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["posts"][0] == {
        **default_post_response_data(channel, post, user),
        "stickied": True,
    }


def test_list_posts_forbidden(client, logged_in_profile):
    """List posts in a channel the user doesn't have access to"""
    url = reverse("post-list", kwargs={"channel_name": "my_channel2"})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_posts_not_found(client, logged_in_profile):
    """List posts in a channel the user doesn't have access to"""
    url = reverse("post-list", kwargs={"channel_name": "missing"})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_posts_pagination_first_page_no_params(
    mocker, user_client, settings, private_channel_and_contributor, reddit_factories
):
    """Test that post pagination works for the first page if no params"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(
        reversed(
            [
                reddit_factories.text_post(idx, user=user, channel=channel)
                for idx in range(15)
            ]
        )
    )
    params = {}
    expected = {
        "after": "t3_{}".format(posts[4].id),
        "after_count": 5,
        "sort": POSTS_SORT_HOT,
    }
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["pagination"] == expected


def test_list_posts_pagination_first_page_with_params(
    mocker, user_client, settings, private_channel_and_contributor, reddit_factories
):
    """Test that post pagination works for the first page with params"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(
        reversed(
            [
                reddit_factories.text_post(idx, user=user, channel=channel)
                for idx in range(15)
            ]
        )
    )
    params = {"before": "t3_{}".format(posts[5].id), "count": 6}
    expected = {
        "after": "t3_{}".format(posts[4].id),
        "after_count": 5,
        "sort": POSTS_SORT_HOT,
    }
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["pagination"] == expected


def test_list_posts_pagination_non_first_page(
    mocker, user_client, settings, private_channel_and_contributor, reddit_factories
):
    """Test that post pagination works for a page that's not the first one"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(
        reversed(
            [
                reddit_factories.text_post(idx, user=user, channel=channel)
                for idx in range(15)
            ]
        )
    )
    params = {"after": "t3_{}".format(posts[4].id), "count": 5}
    expected = {
        "before": "t3_{}".format(posts[5].id),
        "before_count": 6,
        "after": "t3_{}".format(posts[9].id),
        "after_count": 10,
        "sort": POSTS_SORT_HOT,
    }
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["pagination"] == expected


def test_list_posts_pagination_non_offset_page(
    mocker, user_client, settings, private_channel_and_contributor, reddit_factories
):
    """Test that post pagination works for a page that doesn't align to the number of results"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(
        reversed(
            [
                reddit_factories.text_post(idx, user=user, channel=channel)
                for idx in range(15)
            ]
        )
    )
    params = {"after": "t3_{}".format(posts[5].id), "count": 5}
    expected = {
        "before": "t3_{}".format(posts[6].id),
        "before_count": 6,
        "after": "t3_{}".format(posts[10].id),
        "after_count": 10,
        "sort": POSTS_SORT_HOT,
    }
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["pagination"] == expected


def test_list_posts_anonymous(mocker, client, public_channel, reddit_factories):
    """Anonymous users can see posts for a public channel, if the feature flag is set"""
    user = UserFactory.create(username="01CBFJMB9PD3JP17KAX3E5JQ46")
    post = reddit_factories.link_post("link_post", user=user, channel=public_channel)

    url = reverse("post-list", kwargs={"channel_name": public_channel.name})
    with raise_error_on_submission_fetch(mocker), raise_error_on_subreddit_fetch(
        mocker
    ):
        resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "pagination": {"sort": "hot"},
        "posts": [
            {**default_post_response_data(public_channel, post, user), "upvoted": False}
        ],
    }


def test_create_post_without_upvote(user_client, private_channel_and_contributor):
    """Test creating a post without an upvote in the body"""
    channel, user = private_channel_and_contributor
    url = reverse("post-list", kwargs={"channel_name": channel.name})
    resp = user_client.post(url, {"title": "x", "text": "y", "upvoted": False})
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "title": "x",
        "text": "y",
        "article_content": None,
        "plain_text": "y",
        "url": None,
        "url_domain": None,
        "cover_image": None,
        "thumbnail": None,
        "author_id": user.username,
        "created": "2020-07-28T22:15:27+00:00",
        "upvoted": False,
        "removed": False,
        "deleted": False,
        "subscribed": True,
        "id": "10",
        "slug": "x",
        "num_comments": 0,
        "score": 1,
        "channel_name": channel.name,
        "channel_title": channel.title,
        "channel_type": channel.channel_type,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        "num_reports": None,
        "post_type": LINK_TYPE_SELF,
    }


def test_update_article_post(
    user_client, reddit_factories, private_channel_and_contributor
):
    """Test that we can update the content of an article post"""
    article_content = [{"data": "updated"}]
    channel, user = private_channel_and_contributor
    post = reddit_factories.article_post("post", user=user, channel=channel)
    url = reverse("post-detail", kwargs={"post_id": post.id})
    resp = user_client.patch(url, {"article_content": article_content})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        **default_post_response_data(channel, post, user),
        "article_content": article_content,
    }


def test_update_article_cover(
    user_client, reddit_factories, private_channel_and_contributor
):
    """
    It should upload a cover image for an existing article
    """
    channel, user = private_channel_and_contributor
    post = reddit_factories.article_post("post", user=user, channel=channel)
    url = reverse("post-detail", kwargs={"post_id": post.id})
    png_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "static",
        "images",
        "mit-logo-micromasters.jpg",
    )
    with open(png_file, "rb") as f:
        resp = user_client.patch(url, {"cover_image": f}, format="multipart")
    assert resp.status_code == status.HTTP_200_OK
    article = Article.objects.get(post__post_id=resp.json()["id"])
    assert len(article.cover_image.read()) == os.path.getsize(png_file)

    # Now update the article again, with the same cover (sent as URL)
    image_url = "http://localhost/{}".format(article.cover_image.url)
    resp = user_client.patch(
        url, {"cover_image": image_url, "article_content": "foo"}, format="json"
    )
    assert resp.status_code == status.HTTP_200_OK
    article = Article.objects.get(post__post_id=resp.json()["id"])
    assert image_url.endswith(article.cover_image.url)

    # Remove the image
    resp = user_client.patch(url, {"article_content": "foo"}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    article = Article.objects.get(post__post_id=resp.json()["id"])
    assert article.cover_image.name == ""


class PostDetailTests:
    """Tests for the post-detail endpoint"""

    def scenario(self, private_channel_and_contributor, reddit_factories, staff_user):
        """Fixture that sets up a common scenario for post-detail tests"""
        channel, user = private_channel_and_contributor
        post = reddit_factories.text_post("just a post", user, channel=channel)
        url = reverse("post-detail", kwargs={"post_id": post.id})
        default_response = default_post_response_data(channel, post, user)
        default_staff_response = default_post_response_data(channel, post, staff_user)
        return SimpleNamespace(
            channel=channel,
            user=user,
            staff_user=staff_user,
            post=post,
            url=url,
            default_response=default_response,
            default_staff_response=default_staff_response,
        )

    @pytest.mark.parametrize(
        "request_data,exp_response_data",
        [
            ({"text": "overwrite"}, {"text": "overwrite"}),
            ({"upvoted": False}, {"upvoted": False}),
            ({"upvoted": True}, {"upvoted": True}),
        ],
    )
    def test_update_post(
        self, user_client, scenario, request_data, exp_response_data, mock_spam_check
    ):
        """
        Test that non-staff users are allowed to make certain requests to update a post, and that
        the response from the API matches our expectations
        """
        resp = user_client.patch(scenario.url, format="json", data=request_data)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {**scenario.default_response, **exp_response_data}
        mock_spam_check.assert_called_with(any_instance_of(Request), resp.json()["id"])

    @pytest.mark.parametrize(
        "request_data,exp_response_data",
        [
            ({"ignore_reports": True}, {}),
            ({"removed": True}, {"removed": True}),
            ({"stickied": True}, {"stickied": True}),
        ],
    )
    def test_update_post_staff_only(
        self, staff_client, scenario, request_data, exp_response_data
    ):
        """
        Test that staff users are allowed to make certain requests to update a post, and that
        the response from the API matches our expectations
        """
        resp = staff_client.patch(scenario.url, format="json", data=request_data)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {**scenario.default_staff_response, **exp_response_data}

    @pytest.mark.parametrize(
        "request_data",
        [{"ignore_reports": True}, {"removed": True}, {"stickied": True}],
    )
    def test_update_post_non_staff_error(self, user_client, scenario, request_data):
        """
        Test that non-staff users attempting to make staff-only updates to a post will result in a
        permission error
        """
        resp = user_client.patch(scenario.url, format="json", data=request_data)
        assert resp.status_code in DJANGO_PERMISSION_ERROR_TYPES
        assert resp.data == {
            "error_type": PERMISSION_DENIED_ERROR_TYPE,
            "detail": "You do not have permission to perform this action.",
        }

    def test_update_post_unsticky(self, staff_client, staff_api, scenario):
        """Test updating just the stickied boolean on a post"""
        staff_api.pin_post(scenario.post.id, True)
        resp = staff_client.patch(scenario.url, format="json", data={"stickied": False})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["stickied"] is False

    def test_update_post_clear_removed(self, staff_client, staff_api, scenario):
        """Test updating a post to re-approve it"""
        staff_api.remove_post(scenario.post.id)
        resp = staff_client.patch(scenario.url, format="json", data={"removed": False})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {**scenario.default_staff_response, "removed": False}

    def test_update_post_forbidden(self, staff_client, scenario):
        """Test updating a post the user isn't the owner of"""
        resp = staff_client.patch(
            scenario.url, format="json", data={"text": "overwrite"}
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_update_post_not_found(self, user_client):
        """Test updating a post that doesn't exist"""
        url = reverse("post-detail", kwargs={"post_id": "missing"})
        resp = user_client.patch(url, format="json", data={"text": "overwrite"})
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    # Reddit doesn't indicate if a post deletion failed so we don't have tests for that
    def test_delete_post(self, user_client, scenario):
        """Delete a post in a channel"""
        resp = user_client.delete(scenario.url)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    @pytest.mark.parametrize(
        "has_post_subscription,has_comment_subscription,expected_before,expected_after",
        [
            (True, False, 1, 1),
            (True, True, 2, 2),
            (False, True, 1, 2),
            (False, False, 0, 1),
        ],
    )
    def test_subscribe_post(
        self,
        staff_client,
        staff_api,
        scenario,
        reddit_factories,
        has_post_subscription,
        has_comment_subscription,
        expected_before,
        expected_after,
    ):  # pylint: disable=too-many-arguments
        """Test subscribing to a post"""
        comment = reddit_factories.comment(
            "just a comment", scenario.user, post_id=scenario.post.id
        )
        if has_post_subscription:
            staff_api.add_post_subscription(scenario.post.id)
        if has_comment_subscription:
            staff_api.add_comment_subscription(scenario.post.id, comment.id)
        assert Subscription.objects.count() == expected_before
        resp = staff_client.patch(scenario.url, {"subscribed": True})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {**scenario.default_response, "subscribed": True}
        assert Subscription.objects.count() == expected_after

    def test_unsubscribe_post(self, user_client, contributor_api, scenario):
        """Test unsubscribing to a post"""
        contributor_api.add_post_subscription(scenario.post.id)
        resp = user_client.patch(scenario.url, {"subscribed": False})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {**scenario.default_response, "subscribed": False}


def test_post_anonymous(client):
    """Anonymous users can't update or delete posts"""
    url = reverse("post-detail", kwargs={"post_id": "doesntmatter"})
    update_resp = client.patch(url, format="json", data={"text": "overwrite"})
    delete_resp = client.delete(url)
    for resp in [update_resp, delete_resp]:
        assert resp.status_code in DJANGO_PERMISSION_ERROR_TYPES
        assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE
