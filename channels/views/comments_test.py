"""Tests for views for REST APIs for comments"""
# pylint: disable=unused-argument
from itertools import product

import pytest
from django.core.urlresolvers import reverse
from rest_framework import status

from channels.test_constants import LIST_MORE_COMMENTS_RESPONSE
from channels.serializers import default_profile_image
from open_discussions.factories import UserFactory

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures("use_betamax", "praw_settings"),
]


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_comments(client, logged_in_profile, missing_user):
    """List all comments in the comment tree"""
    if missing_user:
        logged_in_profile.user.username = 'renamed'
        logged_in_profile.user.save()
        profile_image = default_profile_image
        name = "[deleted]"
        author_id = '[deleted]'
    else:
        profile_image = logged_in_profile.image_small
        author_id = logged_in_profile.user.username
        name = logged_in_profile.name

    url = reverse('comment-list', kwargs={'post_id': '2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "id": "1",
            'parent_id': None,
            "post_id": "2",
            "text": "hello world",
            "author_id": author_id,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "removed": False,
            "created": "2017-07-25T17:09:45+00:00",
            'profile_image': profile_image,
            'author_name': name,
            'edited': False,
            'comment_type': 'comment',
            'num_reports': 0,
        },
        {
            "id": "2",
            'parent_id': '1',
            "post_id": "2",
            "text": "texty text text",
            "author_id": author_id,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "removed": False,
            "created": "2017-07-25T17:15:57+00:00",
            'profile_image': profile_image,
            'author_name': name,
            'edited': True,
            'comment_type': 'comment',
            'num_reports': 0,
        },
        {
            "id": "3",
            'parent_id': '1',
            "post_id": "2",
            "text": "reply2",
            "author_id": author_id,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "removed": False,
            "created": "2017-07-25T17:16:10+00:00",
            'profile_image': profile_image,
            'author_name': name,
            'edited': False,
            'comment_type': 'comment',
            'num_reports': 0,
        },
    ]


def test_list_comments_forbidden(client, logged_in_profile):
    """List all comments in the comment tree for a post the user doesn't have access to"""
    url = reverse('comment-list', kwargs={'post_id': 'adc'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_comments_not_found(client, logged_in_profile):
    """List all comments in the comment tree for a post that doesn't exist"""
    url = reverse('comment-list', kwargs={'post_id': 'missing'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_comments_more(client, logged_in_profile):
    """List comments for a post which has more comments"""
    logged_in_profile.image_small = '/deserunt/consequatur.jpg'
    logged_in_profile.name = 'Brooke Robles'
    logged_in_profile.save()

    url = reverse('comment-list', kwargs={'post_id': '1'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == LIST_MORE_COMMENTS_RESPONSE


@pytest.mark.parametrize("is_root_comment", [True, False])
def test_more_comments(client, logged_in_profile, is_root_comment):
    """Retrieve more comments"""
    image_url = '/deserunt/consequatur.jpg'
    name = 'Brooke Robles'
    username = '01BWRGE5JQK4E8B0H90K9RM4WF'
    UserFactory.create(
        username=username,
        profile__image_small=image_url,
        profile__name=name,
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
            "created": "2017-10-19T19:47:22+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment",
            'num_reports': 0,
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
            "created": "2017-10-23T17:45:14+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment",
            'num_reports': 0,
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
            "created": "2017-10-23T17:45:25+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment",
            'num_reports': 0,
        }
    ]

    url = "{base}?post_id={post_id}{parent_query}".format(
        base=reverse('morecomments-detail'),
        post_id=post_id,
        parent_query='' if is_root_comment else '&parent_id={}'.format(middle_comment["id"])
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    if is_root_comment:
        assert resp.json() == [root_comment, middle_comment, edge_comment]
    else:
        assert resp.json() == [edge_comment]


def test_more_comments_children(client, logged_in_profile):
    """Retrieve more comments specifying child elements"""
    image_url = '/deserunt/consequatur.jpg'
    name = 'Brooke Robles'
    username = 'george'

    logged_in_profile.image_small = image_url
    logged_in_profile.name = name
    logged_in_profile.save()

    post_id = "1"
    url = "{base}?post_id={post_id}&parent_id=&children=e9l&children=e9m".format(
        base=reverse('morecomments-detail'),
        post_id=post_id,
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
            "created": "2017-11-09T16:35:55+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment",
            'num_reports': 0,
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
            "created": "2017-11-09T16:36:00+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment",
            'num_reports': 0,
        }
    ]


@pytest.mark.parametrize("missing_post,missing_parent", product([True, False], repeat=2))
def test_more_comments_404(client, logged_in_profile, missing_post, missing_parent):
    """If the post id or comment id is wrong, we should return a 404"""
    post_id = "1"
    url = "{base}?post_id={post_id}{parent_query}".format(
        base=reverse('morecomments-detail'),
        post_id=post_id if not missing_post else 'missing_post',
        parent_query='' if not missing_parent else '&parent_id=missing_parent',
    )
    resp = client.get(url)
    expected_status = status.HTTP_404_NOT_FOUND if missing_post or missing_parent else status.HTTP_200_OK
    assert resp.status_code == expected_status


@pytest.mark.parametrize("missing_param", ["post_id"])
def test_more_comments_missing_param(client, logged_in_profile, missing_param):
    """If a parameter is missing a 400 error should be returned"""
    params = {
        "post_id": "post_id",
        "parent_id": "parent_id",
    }
    del params[missing_param]

    params_string = "&".join("{}={}".format(key, value) for key, value in params.items())

    url = "{base}?{params_string}".format(
        base=reverse('morecomments-detail'),
        params_string=params_string,
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_list_deleted_comments(client, logged_in_profile):
    """List comments which are deleted according to reddit"""
    user = UserFactory.create(username='admin')

    url = reverse('comment-list', kwargs={'post_id': 'p'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            'author_id': '[deleted]',
            'comment_type': 'comment',
            'created': '2017-09-27T16:03:42+00:00',
            'downvoted': False,
            'parent_id': None,
            'post_id': 'p',
            'profile_image': default_profile_image,
            'score': 1,
            'text': '[deleted]',
            'upvoted': False,
            "removed": False,
            'id': '1s',
            'edited': False,
            "author_name": "[deleted]",
            'num_reports': 0,
        },
        {
            'author_id': user.username,
            'created': '2017-09-27T16:03:51+00:00',
            'comment_type': 'comment',
            'downvoted': False,
            'id': '1t',
            'parent_id': '1s',
            'post_id': 'p',
            'profile_image': user.profile.image_small,
            'score': 1,
            'text': 'reply to parent which is not deleted',
            'upvoted': False,
            "removed": False,
            'edited': False,
            "author_name": user.profile.name,
            'num_reports': 0,
        }
    ]


def test_create_comment(client, logged_in_profile):
    """Create a comment"""
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:20:35+00:00',
        'id': '7',
        'parent_id': None,
        'post_id': post_id,
        'score': 1,
        'text': 'reply_to_post 2',
        'upvoted': True,
        "downvoted": False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_create_comment_forbidden(client, logged_in_profile):
    """Create a comment for a post the user doesn't have access to"""
    post_id = 'adc'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_not_found(client, logged_in_profile):
    """Create a comment for a post that doesn't exist"""
    post_id = 'missing'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_no_upvote(client, logged_in_profile):
    """Create a comment without an upvote"""
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "no upvoted",
        "upvoted": False,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:21:48+00:00',
        'id': '9',
        'parent_id': None,
        'post_id': post_id,
        'score': 1,
        'text': 'no upvoted',
        'upvoted': False,
        "downvoted": False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_create_comment_downvote(client, logged_in_profile):
    """Create a comment with a downvote"""
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "downvoted",
        "downvoted": True,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': 'l',
        'parent_id': None,
        'post_id': post_id,
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': True,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_create_comment_reply_to_comment(client, logged_in_profile):
    """Create a comment that's a reply to another comment"""
    post_id = '2'
    parent_comment_id = '3'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_comment 3",
        "comment_id": parent_comment_id,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'parent_id': parent_comment_id,
        'post_id': post_id,
        'score': 1,
        'text': 'reply_to_comment 3',
        'upvoted': True,
        "downvoted": False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_update_comment_text(client, logged_in_profile):
    """Update a comment's text"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.patch(url, type='json', data={
        "text": "updated text",
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'parent_id': '3',
        'post_id': '2',
        'score': 1,
        'text': 'updated text',
        'upvoted': False,
        'downvoted': False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': True,
        'comment_type': 'comment',
        'num_reports': 0,
    }


# Reddit returns the same result for updating a missing comment
# as it does for updating a comment the user doesn't own.
def test_update_comment_forbidden(client, logged_in_profile):
    """Update a comment's text for a comment the user doesn't own"""
    url = reverse('comment-detail', kwargs={'comment_id': 'e8h'})
    resp = client.patch(url, type='json', data={
        "text": "updated text",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_comment_upvote(client, logged_in_profile):
    """Update a comment to upvote it"""
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "upvoted": True,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'parent_id': None,
        'post_id': '2',
        'score': 1,
        'text': 'downvoted',
        'upvoted': True,
        'downvoted': False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_update_comment_downvote(client, logged_in_profile):
    """Update a comment to downvote it"""
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "downvoted": True,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'parent_id': None,
        'post_id': '2',
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': True,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_update_comment_clear_upvote(client, logged_in_profile):
    """Update a comment to clear its upvote"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.patch(url, type='json', data={
        "upvoted": False,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'parent_id': '3',
        'post_id': '2',
        'score': 1,
        'text': 'reply_to_comment 3',
        'upvoted': False,
        'downvoted': False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_update_comment_clear_downvote(client, logged_in_profile):
    """Update a comment to clear its downvote"""
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "downvoted": False,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'parent_id': None,
        'post_id': '2',
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': False,
        "removed": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_update_comment_remove(
        client, staff_user, private_channel_and_contributor, reddit_factories, staff_api
):
    """Update a comment to remove it as a moderator"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    client.force_login(staff_user)
    url = reverse('comment-detail', kwargs={'comment_id': comment.id})
    resp = client.patch(url, type='json', data={
        "removed": True,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': user.username,
        'created': comment.created,
        'id': comment.id,
        'parent_id': None,
        'post_id': post.id,
        'score': 1,
        'text': comment.text,
        'upvoted': False,
        'downvoted': False,
        "removed": True,
        'profile_image': user.profile.image_small,
        'author_name': user.profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


def test_update_comment_approve(
        client, staff_user, private_channel_and_contributor, reddit_factories, staff_api
):
    """Update a comment to approve it as a moderator"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("post", user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    staff_api.remove_comment(comment.id)
    client.force_login(staff_user)
    url = reverse('comment-detail', kwargs={'comment_id': comment.id})
    resp = client.patch(url, type='json', data={
        "removed": False,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': user.username,
        'created': comment.created,
        'id': comment.id,
        'parent_id': None,
        'post_id': post.id,
        'score': 1,
        'text': comment.text,
        'upvoted': False,
        'downvoted': False,
        "removed": False,
        'profile_image': user.profile.image_small,
        'author_name': user.profile.name,
        'edited': False,
        'comment_type': 'comment',
        'num_reports': 0,
    }


# Reddit doesn't indicate if a comment deletion failed so we don't have tests that
def test_delete_comment(client, logged_in_profile):
    """Delete a comment"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT
