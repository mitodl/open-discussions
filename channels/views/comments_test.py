"""Tests for views for REST APIs for comments"""
# pylint: disable=unused-argument,redefined-outer-name,too-many-lines
from datetime import datetime
from itertools import product
import time

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.request import Request

from channels.constants import DELETED_COMMENT_OR_POST_TEXT
from channels.models import Comment
from channels.test_constants import LIST_MORE_COMMENTS_RESPONSE
from channels.test_utils import assert_properties_eq
from channels.views.test_utils import default_comment_response_data
from open_discussions.constants import (
    NOT_AUTHENTICATED_ERROR_TYPE,
    PERMISSION_DENIED_ERROR_TYPE,
)
from open_discussions.factories import UserFactory
from open_discussions.test_utils import any_instance_of
from profiles.utils import image_uri, DEFAULT_PROFILE_IMAGE

pytestmark = pytest.mark.betamax


@pytest.fixture(autouse=True)
def mock_spam_check(mocker):
    """Mock the check_comment_for_spam task"""
    return mocker.patch("channels.task_helpers.check_comment_for_spam")


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_comments(
    cassette_exists, user_client, user, reddit_factories, public_channel, missing_user
):  # pylint: disable=too-many-arguments,too-many-locals
    """List all comments in the comment tree"""
    if missing_user:
        user.username = "renamed"
        user.save()
        profile_image = DEFAULT_PROFILE_IMAGE
        name = "[deleted]"
        author_id = "[deleted]"
        headline = None
    else:
        profile_image = image_uri(user.profile)
        author_id = user.username
        headline = user.profile.headline
        name = user.profile.name

    post = reddit_factories.text_post(
        "a post with comments", user, channel=public_channel
    )
    comments = []
    for idx in range(2):
        comment = reddit_factories.comment(f"comment-{idx}", user, post_id=post.id)
        comments.append((None, comment))
        comments.extend(
            [
                (
                    comment.id,
                    reddit_factories.comment(
                        f"comment-nested-{idx2}", user, comment_id=comment.id
                    ),
                )
                for idx2 in range(3)
            ]
        )

    if not cassette_exists:
        # if we're writing the cassette, wait for the backend to asynchronously
        # finish updating the comment tree so we see everything
        time.sleep(10)

    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    json = resp.json()
    # the order isn't entirely deterministic when testing, so just assert the number of elements and the presence of all of them
    assert len(json) == len(comments)
    for parent_id, comment in comments:
        assert {
            "id": comment.id,
            "parent_id": parent_id,
            "post_id": post.id,
            "text": comment.text,
            "author_id": author_id,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": comment.created,
            "profile_image": profile_image,
            "author_name": name,
            "author_headline": headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        } in json


def test_list_comments_anonymous(client, public_channel, reddit_factories):
    """List comments as an anonymous user"""
    user = UserFactory.create(username="01CBD756K3RS4Z59TCJ46QCHZJ")
    post = reddit_factories.text_post(
        "a post with comments", user, channel=public_channel
    )
    comment = reddit_factories.comment("comment", user, post_id=post.id)

    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "id": comment.id,
            "parent_id": None,
            "post_id": post.id,
            "text": comment.text,
            "author_id": user.username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": comment.created,
            "profile_image": image_uri(user.profile),
            "author_name": user.profile.name,
            "author_headline": user.profile.headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        }
    ]


def test_list_comments_none(
    user_client, private_channel_and_contributor, reddit_factories
):
    """List for no comments on a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("one post", user, channel=channel)
    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == []


def test_list_comments_forbidden(
    client, private_channel_and_contributor, reddit_factories
):
    """List all comments in the comment tree for a post the user doesn't have access to"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("one post", user, channel=channel)
    url = reverse("comment-list", kwargs={"post_id": post.id})
    client.force_login(UserFactory.create())
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_comments_not_found(user_client):
    """List all comments in the comment tree for a post that doesn't exist"""
    url = reverse("comment-list", kwargs={"post_id": "missing"})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_comments_more(client, logged_in_profile):
    """List comments for a post which has more comments"""
    logged_in_profile.image_small = "/deserunt/consequatur.jpg"
    logged_in_profile.image_small_file = None
    logged_in_profile.name = "Brooke Robles"
    logged_in_profile.headline = "Brooke's headline"
    logged_in_profile.save()

    url = reverse("comment-list", kwargs={"post_id": "1"})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == LIST_MORE_COMMENTS_RESPONSE


@pytest.mark.parametrize("is_root_comment", [True, False])
def test_more_comments(client, logged_in_profile, is_root_comment):
    """Retrieve more comments"""
    image_url = "/deserunt/consequatur.jpg"
    name = "Brooke Robles"
    username = "01BWRGE5JQK4E8B0H90K9RM4WF"
    headline = "test headline"
    UserFactory.create(
        username=username,
        profile__image_small=image_url,
        profile__image_small_file=None,
        profile__name=name,
        profile__headline=headline,
    )

    post_id = "1"
    root_comment, middle_comment, edge_comment = [
        {
            "id": "m",
            "parent_id": "1",
            "post_id": post_id,
            "text": "m",
            "author_id": username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": "2017-10-19T19:47:22+00:00",
            "profile_image": image_url,
            "author_name": name,
            "author_headline": headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        },
        {
            "id": "n",
            "parent_id": "m",
            "post_id": post_id,
            "text": "oasd",
            "author_id": username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": "2017-10-23T17:45:14+00:00",
            "profile_image": image_url,
            "author_name": name,
            "author_headline": headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        },
        {
            "id": "o",
            "parent_id": "n",
            "post_id": post_id,
            "text": "k;lkl;",
            "author_id": username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": "2017-10-23T17:45:25+00:00",
            "profile_image": image_url,
            "author_name": name,
            "author_headline": headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        },
    ]

    url = "{base}?post_id={post_id}{parent_query}".format(
        base=reverse("morecomments-detail"),
        post_id=post_id,
        parent_query=""
        if is_root_comment
        else "&parent_id={}".format(middle_comment["id"]),
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    if is_root_comment:
        assert resp.json() == [root_comment, middle_comment, edge_comment]
    else:
        assert resp.json() == [edge_comment]


def test_more_comments_children(client, logged_in_profile):
    """Retrieve more comments specifying child elements"""
    image_url = "/deserunt/consequatur.jpg"
    name = "Brooke Robles"
    username = "george"
    headline = "a test headline"

    logged_in_profile.image_small = image_url
    logged_in_profile.image_file_small = None
    logged_in_profile.name = name
    logged_in_profile.headline = headline
    logged_in_profile.save()

    post_id = "1"
    url = "{base}?post_id={post_id}&parent_id=&children=e9l&children=e9m".format(
        base=reverse("morecomments-detail"), post_id=post_id
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "id": "e9l",
            "parent_id": None,
            "post_id": "1",
            "text": "shallow comment 25",
            "author_id": username,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": "2017-11-09T16:35:55+00:00",
            "profile_image": image_uri(logged_in_profile),
            "author_name": name,
            "author_headline": headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        },
        {
            "id": "e9m",
            "parent_id": None,
            "post_id": "1",
            "text": "shallow comment 26",
            "author_id": username,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "created": "2017-11-09T16:36:00+00:00",
            "profile_image": image_uri(logged_in_profile),
            "author_name": name,
            "author_headline": headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        },
    ]


def test_more_comments_anonymous(client, public_channel, reddit_factories):
    """List more comments as an anonymous user"""
    user = UserFactory.create(username="01CBDB4ZD2QXBM0ERGB3C5GEA5")
    post = reddit_factories.text_post(
        "a post with comments", user, channel=public_channel
    )
    # 51 to show a morecomments link
    comments = [
        reddit_factories.comment("comment{}".format(number), user, post_id=post.id)
        for number in range(51)
    ]
    last_comment = comments[-1]

    url = "{base}?post_id={post_id}&children={comment_id}".format(
        base=reverse("morecomments-detail"), post_id=post.id, comment_id=last_comment.id
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "author_id": user.username,
            "author_name": user.profile.name,
            "author_headline": user.profile.headline,
            "comment_type": "comment",
            "created": last_comment.created,
            "deleted": False,
            "downvoted": False,
            "edited": False,
            "id": last_comment.id,
            "num_reports": None,
            "parent_id": None,
            "post_id": post.id,
            "profile_image": image_uri(user.profile),
            "removed": False,
            "score": 1,
            "subscribed": False,
            "text": last_comment.text,
            "upvoted": False,
        }
    ]


@pytest.mark.parametrize(
    "missing_post,missing_parent", product([True, False], repeat=2)
)
def test_more_comments_404(client, logged_in_profile, missing_post, missing_parent):
    """If the post id or comment id is wrong, we should return a 404"""
    post_id = "1"
    url = "{base}?post_id={post_id}{parent_query}".format(
        base=reverse("morecomments-detail"),
        post_id=post_id if not missing_post else "missing_post",
        parent_query="" if not missing_parent else "&parent_id=missing_parent",
    )
    resp = client.get(url)
    expected_status = (
        status.HTTP_404_NOT_FOUND
        if missing_post or missing_parent
        else status.HTTP_200_OK
    )
    assert resp.status_code == expected_status


@pytest.mark.parametrize("missing_param", ["post_id"])
def test_more_comments_missing_param(client, logged_in_profile, missing_param):
    """If a parameter is missing a 400 error should be returned"""
    params = {"post_id": "post_id", "parent_id": "parent_id"}
    del params[missing_param]

    params_string = "&".join(
        "{}={}".format(key, value) for key, value in params.items()
    )

    url = "{base}?{params_string}".format(
        base=reverse("morecomments-detail"), params_string=params_string
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_list_deleted_comments(client, logged_in_profile):
    """List comments which are deleted according to reddit"""
    user = UserFactory.create(username="admin")

    url = reverse("comment-list", kwargs={"post_id": "p"})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "author_id": "[deleted]",
            "comment_type": "comment",
            "created": "2017-09-27T16:03:42+00:00",
            "downvoted": False,
            "parent_id": None,
            "post_id": "p",
            "profile_image": DEFAULT_PROFILE_IMAGE,
            "score": 1,
            "text": DELETED_COMMENT_OR_POST_TEXT,
            "upvoted": False,
            "removed": False,
            "deleted": True,
            "subscribed": False,
            "id": "1s",
            "edited": False,
            "author_name": "[deleted]",
            "author_headline": None,
            "num_reports": None,
        },
        {
            "author_id": user.username,
            "created": "2017-09-27T16:03:51+00:00",
            "comment_type": "comment",
            "downvoted": False,
            "id": "1t",
            "parent_id": "1s",
            "post_id": "p",
            "profile_image": image_uri(user.profile),
            "score": 1,
            "text": "reply to parent which is not deleted",
            "upvoted": False,
            "removed": False,
            "edited": False,
            "deleted": False,
            "subscribed": False,
            "author_name": user.profile.name,
            "author_headline": user.profile.headline,
            "num_reports": None,
        },
    ]


def test_get_comment(user_client, private_channel_and_contributor, reddit_factories):
    """
    should be able to GET a comment
    """
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("my geat post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "author_id": user.username,
            "created": comment.created,
            "id": comment.id,
            "parent_id": None,
            "post_id": post.id,
            "score": 1,
            "text": comment.text,
            "upvoted": True,
            "downvoted": False,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "profile_image": image_uri(user.profile),
            "author_name": user.profile.name,
            "author_headline": user.profile.headline,
            "edited": False,
            "comment_type": "comment",
            "num_reports": None,
        }
    ]


def test_get_comment_404(
    user_client, private_channel_and_contributor, reddit_factories
):
    """
    test that we get a 404 for a missing comment
    """
    url = reverse("comment-detail", kwargs={"comment_id": "23432"})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize(
    "client_user_type, expected_status",
    [
        [None, status.HTTP_404_NOT_FOUND],
        ["comment_writer", status.HTTP_200_OK],
        ["user", status.HTTP_404_NOT_FOUND],
        ["staff_user", status.HTTP_200_OK],
    ],
)
def test_get_removed_comment(
    client,
    user,
    staff_user,
    public_channel,
    reddit_factories,
    staff_api,
    client_user_type,
    expected_status,
):  # pylint: disable=too-many-arguments
    """Get for a removed comment should 404 unless the user is a moderator"""
    comment_user = reddit_factories.user("comment user")

    post = reddit_factories.text_post("my geat post", user, channel=public_channel)
    comment = reddit_factories.comment("comment", comment_user, post_id=post.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})

    staff_api.remove_comment(comment.id)

    if client_user_type == "comment_writer":
        client.force_login(comment_user)
    elif client_user_type == "user":
        client.force_login(user)
    elif client_user_type == "staff_user":
        client.force_login(staff_user)

    resp = client.get(url)

    assert resp.status_code == expected_status


def test_get_comment_anonymous(client, public_channel, reddit_factories):
    """Get a comment as an anonymous user"""
    user = UserFactory.create(username="01CBDBP5F8XRQ1T5GATHDWA99Z")
    post = reddit_factories.text_post(
        "a post with a comment", user, channel=public_channel
    )
    comment = reddit_factories.comment("comment", user, post_id=post.id)

    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [default_comment_response_data(post, comment, user)]


@pytest.mark.parametrize(
    "extra_params,extra_expected,score",
    [
        ({}, {}, 1),
        ({"upvoted": False}, {"upvoted": False}, 0),
        ({"downvoted": True}, {"upvoted": False, "downvoted": True}, -1),
    ],
)
def test_create_comment(
    user_client,
    reddit_factories,
    private_channel_and_contributor,
    mock_notify_subscribed_users,
    mock_spam_check,
    extra_params,
    extra_expected,
    score,
):  # pylint: disable=too-many-arguments
    """Create a comment"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("a post", user, channel=channel)
    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = user_client.post(url, data={"text": "reply_to_post 2", **extra_params})
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "author_id": user.username,
        "created": any_instance_of(str),
        "id": any_instance_of(str),
        "parent_id": None,
        "post_id": post.id,
        "score": 1,
        "text": "reply_to_post 2",
        "upvoted": True,
        "downvoted": False,
        "removed": False,
        "deleted": False,
        "subscribed": True,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "comment_type": "comment",
        "num_reports": None,
        **extra_expected,
    }

    assert_properties_eq(
        Comment.objects.get(comment_id=resp.json()["id"]),
        {
            "author": user,
            "text": "reply_to_post 2",
            "score": score,
            "removed": False,
            "deleted": False,
            "edited": False,
            "created_on": any_instance_of(datetime),
        },
    )

    mock_notify_subscribed_users.assert_called_once_with(
        post.id, None, resp.json()["id"]
    )
    mock_spam_check.assert_called_with(any_instance_of(Request), resp.json()["id"])


def test_create_comment_moderator(
    user_client,
    reddit_factories,
    private_channel_and_contributor,
    mock_notify_subscribed_users,
    mock_spam_check,
    staff_api,
):  # pylint: disable=too-many-arguments
    """Create a comment as a moderator"""
    channel, user = private_channel_and_contributor
    staff_api.add_moderator(user.username, channel.name)
    post = reddit_factories.text_post("a post", user, channel=channel)
    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = user_client.post(url, data={"text": "reply_to_post 2"})
    assert resp.status_code == status.HTTP_201_CREATED

    mock_spam_check.assert_not_called()


def test_create_comment_forbidden(user_client):
    """Create a comment for a post the user doesn't have access to"""
    post_id = "adc"
    url = reverse("comment-list", kwargs={"post_id": post_id})
    resp = user_client.post(url, data={"text": "reply_to_post 2"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_anonymous(client):
    """Anonymous users can't create comments"""
    url = reverse("comment-list", kwargs={"post_id": "doesntmatter"})
    resp = client.post(url, data={"text": "reply_to_post 2"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_create_comment_not_found(user_client):
    """Create a comment for a post that doesn't exist"""
    post_id = "missing"
    url = reverse("comment-list", kwargs={"post_id": post_id})
    resp = user_client.post(url, data={"text": "reply_to_post 2"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_reply_to_comment(
    user_client,
    reddit_factories,
    private_channel_and_contributor,
    mock_notify_subscribed_users,
    mock_spam_check,
):
    """Create a comment that's a reply to another comment"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("a post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = user_client.post(
        url, data={"text": "reply_to_comment 3", "comment_id": comment.id}
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "author_id": user.username,
        "created": any_instance_of(str),
        "id": any_instance_of(str),
        "parent_id": comment.id,
        "post_id": post.id,
        "score": 1,
        "text": "reply_to_comment 3",
        "upvoted": True,
        "downvoted": False,
        "removed": False,
        "deleted": False,
        "subscribed": True,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "comment_type": "comment",
        "num_reports": None,
    }
    mock_notify_subscribed_users.assert_called_once_with(
        post.id, comment.id, resp.json()["id"]
    )
    mock_spam_check.assert_called_with(any_instance_of(Request), resp.json()["id"])


def test_create_comment_reply_to_deleted_comment(
    user_client, private_channel_and_contributor, reddit_factories, contributor_api
):
    """Create a comment that's a reply to a deleted comment"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    contributor_api.delete_comment(comment.id)

    url = reverse("comment-list", kwargs={"post_id": post.id})
    resp = user_client.post(
        url, data={"text": "reply_to_comment 3", "comment_id": comment.id}
    )
    assert resp.status_code == status.HTTP_410_GONE
    assert resp.json() == {"detail": "Resource is gone.", "error_type": "GoneException"}


def test_update_comment_text(
    user_client, private_channel_and_contributor, reddit_factories, mock_spam_check
):
    """Update a comment's text"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("my geat post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)

    updated_text = "updated text"
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = user_client.patch(url, type="json", data={"text": updated_text})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["text"] == updated_text
    mock_spam_check.assert_called_with(any_instance_of(Request), resp.json()["id"])


def test_update_comment_text_moderator(
    user_client,
    private_channel_and_contributor,
    reddit_factories,
    mock_spam_check,
    staff_api,
):
    """Update a comment's text as a moderator"""
    channel, user = private_channel_and_contributor
    staff_api.add_moderator(user.username, channel.name)
    post = reddit_factories.text_post("my geat post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)

    updated_text = "updated text"
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = user_client.patch(url, type="json", data={"text": updated_text})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["text"] == updated_text
    mock_spam_check.assert_not_called()


# Reddit returns the same result for updating a missing comment
# as it does for updating a comment the user doesn't own.
def test_update_comment_forbidden(user_client):
    """Update a comment's text for a comment the user doesn't own"""
    url = reverse("comment-detail", kwargs={"comment_id": "e8h"})
    resp = user_client.patch(url, type="json", data={"text": "updated text"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_comment_anonymous(client):
    """Anonymous users can't update comments"""
    url = reverse("comment-detail", kwargs={"comment_id": "doesntmatter"})
    resp = client.patch(url, type="json", data={"text": "missing"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_update_comment_upvote(user_client):
    """Update a comment to upvote it"""
    comment_id = "l"
    url = reverse("comment-detail", kwargs={"comment_id": comment_id})
    resp = user_client.patch(url, type="json", data={"upvoted": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["upvoted"] is True


def test_update_comment_downvote(user_client):
    """Update a comment to downvote it"""
    comment_id = "l"
    url = reverse("comment-detail", kwargs={"comment_id": comment_id})
    resp = user_client.patch(url, type="json", data={"downvoted": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["downvoted"] is True


def test_update_comment_clear_upvote(user_client):
    """Update a comment to clear its upvote"""
    url = reverse("comment-detail", kwargs={"comment_id": "6"})
    resp = user_client.patch(url, type="json", data={"upvoted": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["upvoted"] is False


def test_update_comment_clear_downvote(user_client):
    """Update a comment to clear its downvote"""
    comment_id = "l"
    url = reverse("comment-detail", kwargs={"comment_id": comment_id})
    resp = user_client.patch(url, type="json", data={"downvoted": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["downvoted"] is False


def test_update_comment_remove(
    staff_client, private_channel_and_contributor, reddit_factories, staff_api
):
    """Update a comment to remove it as a moderator"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = staff_client.patch(url, type="json", data={"removed": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["removed"] is True


def test_update_comment_approve(
    staff_client, private_channel_and_contributor, reddit_factories, staff_api
):
    """Update a comment to approve it as a moderator"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    staff_api.remove_comment(comment.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = staff_client.patch(url, type="json", data={"removed": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["removed"] is False


def test_update_comment_ignore_reports(
    staff_client, private_channel_and_contributor, reddit_factories
):
    """Update a comment to ignore reports as a moderator"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = staff_client.patch(url, type="json", data={"ignore_reports": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "author_id": user.username,
        "created": comment.created,
        "id": comment.id,
        "parent_id": None,
        "post_id": post.id,
        "score": 1,
        "text": comment.text,
        "upvoted": False,
        "downvoted": False,
        "removed": False,
        "deleted": False,
        "subscribed": False,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "comment_type": "comment",
        "num_reports": 0,
    }


def test_update_comment_ignore_reports_forbidden(
    user_client, private_channel_and_contributor, reddit_factories
):
    """Test updating a comment to ignore reports with a nonstaff user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = user_client.patch(url, type="json", data={"ignore_reports": True})
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data == {
        "error_type": PERMISSION_DENIED_ERROR_TYPE,
        "detail": "You do not have permission to perform this action.",
    }


# Reddit doesn't indicate if a comment deletion failed so we don't have tests that
def test_delete_comment(user_client):
    """Delete a comment"""
    url = reverse("comment-detail", kwargs={"comment_id": "6"})
    resp = user_client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_delete_comment_anonymous(client):
    """Anonymous users can't delete comments"""
    url = reverse("comment-detail", kwargs={"comment_id": "doesntmatter"})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_update_comment_subscribe(
    staff_client, private_channel_and_contributor, reddit_factories
):
    """Update a comment to subscribe to it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = staff_client.patch(url, type="json", data={"subscribed": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["subscribed"] is True


def test_update_comment_unsubscribe(
    staff_client, staff_api, private_channel_and_contributor, reddit_factories
):
    """Update a comment to unsubscribe from it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    staff_api.add_comment_subscription(post.id, comment.id)
    url = reverse("comment-detail", kwargs={"comment_id": comment.id})
    resp = staff_client.patch(url, type="json", data={"subscribed": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["subscribed"] is False
