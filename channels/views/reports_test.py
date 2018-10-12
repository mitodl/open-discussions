"""Tests for views for REST APIs for reports"""
import pytest
from django.urls import reverse
from rest_framework import status

from channels.api import Api
from channels.views.test_utils import default_post_response_data
from open_discussions.constants import (
    NOT_AUTHENTICATED_ERROR_TYPE,
    PERMISSION_DENIED_ERROR_TYPE,
)
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS
from profiles.utils import image_uri

pytestmark = [pytest.mark.betamax, pytest.mark.usefixtures("mock_channel_exists")]


def test_report_post(user_client, private_channel_and_contributor, reddit_factories):
    """Report a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    url = reverse("report-content")
    payload = {"post_id": post.id, "reason": "spam"}
    resp = user_client.post(url, data=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == payload


def test_report_comment(user_client, private_channel_and_contributor, reddit_factories):
    """Report a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("report-content")
    payload = {"comment_id": comment.id, "reason": "spam"}
    resp = user_client.post(url, data=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == payload


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_report_anonymous(
    client, public_channel, reddit_factories, settings, allow_anonymous
):
    """Anonymous users can't report posts or comments"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    user = UserFactory.create()
    post = reddit_factories.text_post("post", user, channel=public_channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse("report-content")

    # Post
    resp = client.post(url, data={"post_id": post.id, "reason": "spam"})
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE

    # Comment
    resp = client.post(url, data={"comment_id": comment.id, "reason": "spam"})
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_list_reports(
    staff_client, private_channel_and_contributor, reddit_factories, staff_api
):
    """List reported content"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    # report both with a regular user
    api = Api(user)
    api.report_comment(comment.id, "spam")
    api.report_post(post.id, "bad")
    # report both with a moderator user
    staff_api.report_comment(comment.id, "spam")
    staff_api.report_post(post.id, "junk")
    url = reverse("channel-reports", kwargs={"channel_name": channel.name})
    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "post": None,
            "comment": {
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
                "edited": False,
                "comment_type": "comment",
                "num_reports": 2,
            },
            "reasons": ["spam"],
        },
        {
            "post": {
                **default_post_response_data(channel, post, user),
                "num_comments": 1,
                "num_reports": 2,
                "upvoted": False,
            },
            "comment": None,
            "reasons": ["bad", "junk"],
        },
    ]


def test_list_reports_empty(staff_client, private_channel):
    """List reported content when there is none"""
    url = reverse("channel-reports", kwargs={"channel_name": private_channel.name})
    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == []


def test_patch_channel_nonstaff(user_client, private_channel):
    """
    Fail to list a channels reported content if nonstaff user
    """
    url = reverse("channel-reports", kwargs={"channel_name": private_channel.name})
    resp = user_client.get(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data == {
        "error_type": PERMISSION_DENIED_ERROR_TYPE,
        "detail": "You do not have permission to perform this action.",
    }


def test_patch_channel_noauth(client, private_channel):
    """
    Fail to list a channels reported content if no auth
    """
    url = reverse("channel-reports", kwargs={"channel_name": private_channel.name})
    resp = client.get(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE
