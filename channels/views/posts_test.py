"""Tests for views for REST APIs for posts"""
# pylint: disable=unused-argument
import pytest
from django.core.urlresolvers import reverse
from rest_framework import status

from channels.serializers import default_profile_image
from channels.constants import (
    VALID_POST_SORT_TYPES,
    POSTS_SORT_HOT,
)

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures("use_betamax", "praw_settings"),
]


def test_create_url_post(client, private_channel_and_contributor):
    """
    Create a new url post
    """
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'url title 🐨',
        'url': 'http://micromasters.mit.edu/🐨',
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'url title 🐨',
        'url': 'http://micromasters.mit.edu/🐨',
        'text': None,
        'author_id': user.username,
        'created': '2017-11-22T17:19:35+00:00',
        'upvoted': True,
        'id': 'e6',
        'num_comments': 0,
        'removed': False,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_create_text_post(client, private_channel_and_contributor):
    """
    Create a new text post
    """
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'parameterized testing',
        'text': 'tests are great',
        'url': None,
        'author_id': user.username,
        'created': '2017-11-22T17:29:51+00:00',
        'upvoted': True,
        'removed': False,
        'id': 'e7',
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        'profile_image': user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_create_post_forbidden(client, private_channel, jwt_header):
    """
    Create a new text post for a channel the user doesn't have permission to
    """
    url = reverse('post-list', kwargs={'channel_name': private_channel.name})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    }, **jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_post_not_found(client, logged_in_profile):
    """
    Create a new text post for a channel that doesn't exist
    """
    url = reverse('post-list', kwargs={'channel_name': 'doesnt_exist'})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize("missing_user", [True, False])
def test_get_deleted_post(client, missing_user, staff_jwt_header, private_channel_and_contributor, reddit_factories):
    """Get an existing post for a deleted user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("deleted", user, channel=channel)

    if missing_user:
        user.username = 'renamed'
        user.save()

    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.get(url, **staff_jwt_header)
    if missing_user:
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    else:
        assert resp.status_code == status.HTTP_200_OK


# pylint: disable=too-many-arguments
@pytest.mark.parametrize("missing_image", [True, False])
def test_get_post(client, private_channel_and_contributor, reddit_factories, missing_image):
    """Get an existing post with no image"""
    channel, user = private_channel_and_contributor

    if missing_image:
        user.profile.image_small = None
    else:
        user.profile.image_small = '/just/a/great/image.png.jpg.gif'
    user.profile.save()

    profile_image = default_profile_image if missing_image else user.profile.image_small

    post = reddit_factories.text_post('my geat post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "url": None,
        "text": post.text,
        "title": post.title,
        "upvoted": True,
        'removed': False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "profile_image": profile_image,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_get_post_forbidden(client, logged_in_profile):
    """Get a post the user doesn't have permission to"""
    post_id = 'adc'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_post_not_found(client, logged_in_profile):
    """Get a post the user doesn't have permission to"""
    post_id = 'missing'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_post_stickied(client, private_channel_and_contributor, reddit_factories, staff_api):
    """test that stickied posts come back that way"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    staff_api.pin_post(post.id, True)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    get_resp = client.get(url)
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json() == {
        "url": None,
        "text": post.text,
        "title": post.title,
        "upvoted": True,
        'removed': False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "profile_image": user.profile.image_small,
        "edited": False,
        "stickied": True,
        'num_reports': None,
    }


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_posts(client, missing_user, private_channel_and_contributor, reddit_factories):
    """List posts in a channel"""
    channel, user = private_channel_and_contributor
    posts = list(reversed([
        reddit_factories.link_post("link_post", user=user, channel=channel),
        reddit_factories.text_post("text_post", user=user, channel=channel),
    ]))

    if missing_user:
        user.username = 'renamed'
        user.save()

    client.force_login(user)

    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK

    if missing_user:
        # all posts should be filtered out
        assert resp.json() == {
            'posts': [],
            'pagination': {
                'sort': POSTS_SORT_HOT,
            }
        }
    else:
        assert resp.json() == {
            'posts': [
                {
                    "url": post.url,
                    "text": post.text,
                    "title": post.title,
                    "upvoted": True,
                    "removed": False,
                    "score": 1,
                    "author_id": user.username,
                    "id": post.id,
                    "created": post.created,
                    "num_comments": 0,
                    "channel_name": channel.name,
                    "channel_title": channel.title,
                    'author_name': user.profile.name,
                    "profile_image": user.profile.image_small,
                    "edited": False,
                    "stickied": False,
                    'num_reports': None,
                } for post in posts
            ],
            'pagination': {
                'sort': POSTS_SORT_HOT,
            }
        }


@pytest.mark.parametrize("sort", VALID_POST_SORT_TYPES)
def test_list_posts_sorted(client, private_channel_and_contributor, reddit_factories, sort):
    """View the channel listing with sorted options"""
    # note: these sort types are difficult to reproduce unique sort orders in the span of a test,
    #       so we're just checking that the APIs don't error
    channel, user = private_channel_and_contributor
    first_post = reddit_factories.text_post('my post', user, channel=channel)
    second_post = reddit_factories.text_post('my 2nd post', user, channel=channel)
    third_post = reddit_factories.text_post('my 3rd post', user, channel=channel)
    fourth_post = reddit_factories.text_post('my 4th post', user, channel=channel)

    client.force_login(user)

    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, {'sort': sort})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'posts': [{
            "url": None,
            "text": post.text,
            "title": post.title,
            "upvoted": True,
            "removed": False,
            "score": 1,
            "author_id": user.username,
            "id": post.id,
            "created": post.created,
            "num_comments": 0,
            "channel_name": channel.name,
            "channel_title": channel.title,
            'author_name': user.profile.name,
            "profile_image": user.profile.image_small,
            "edited": False,
            "stickied": False,
            'num_reports': None,
        } for post in [fourth_post, third_post, second_post, first_post]],
        'pagination': {
            'sort': sort,
        },
    }


def test_list_posts_stickied(client, private_channel_and_contributor, reddit_factories, staff_api):
    """test that the stickied post is first"""
    channel, user = private_channel_and_contributor
    posts = [
        reddit_factories.text_post("great post!{}".format(i), user, channel=channel)
        for i in range(4)
    ]
    staff_api.pin_post(posts[2].id, True)
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["posts"][0] == {
        "url": posts[2].url,
        "text": posts[2].text,
        "title": posts[2].title,
        "upvoted": True,
        "removed": False,
        "score": 1,
        "author_id": user.username,
        "id": posts[2].id,
        "created": posts[2].created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "profile_image": user.profile.image_small,
        "edited": False,
        "stickied": True,
        'num_reports': None,
    }


def test_list_posts_forbidden(client, logged_in_profile):
    """List posts in a channel the user doesn't have access to"""
    url = reverse('post-list', kwargs={'channel_name': 'my_channel2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_posts_not_found(client, logged_in_profile):
    """List posts in a channel the user doesn't have access to"""
    url = reverse('post-list', kwargs={'channel_name': 'missing'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_posts_pagination_first_page_no_params(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for the first page if no params"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {}
    expected = {
        'after': 't3_{}'.format(posts[4].id),
        'after_count': 5,
        'sort': POSTS_SORT_HOT,
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_first_page_with_params(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for the first page with params"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {'before': 't3_{}'.format(posts[5].id), 'count': 6}
    expected = {
        'after': 't3_{}'.format(posts[4].id),
        'after_count': 5,
        'sort': POSTS_SORT_HOT,
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_non_first_page(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for a page that's not the first one"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {'after': 't3_{}'.format(posts[4].id), 'count': 5}
    expected = {
        'before': 't3_{}'.format(posts[5].id),
        'before_count': 6,
        'after': 't3_{}'.format(posts[9].id),
        'after_count': 10,
        'sort': POSTS_SORT_HOT,
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_non_offset_page(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for a page that doesn't align to the number of results"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {'after': 't3_{}'.format(posts[5].id), 'count': 5}
    expected = {
        'before': 't3_{}'.format(posts[6].id),
        'before_count': 6,
        'after': 't3_{}'.format(posts[10].id),
        'after_count': 10,
        'sort': POSTS_SORT_HOT,
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_update_post_text(client, private_channel_and_contributor, reddit_factories):
    """Test updating just the text of a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"text": "overwrite"})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': 'overwrite',
        'title': post.title,
        'upvoted': True,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_update_post_stickied(client, private_channel_and_contributor, reddit_factories, staff_user):
    """Test updating just the stickied boolean on a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    client.force_login(staff_user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"stickied": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": True,
        'num_reports': 0,
    }


def test_update_post_unsticky(client, private_channel_and_contributor, reddit_factories, staff_api, staff_user):
    """Test updating just the stickied boolean on a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    staff_api.pin_post(post.id, True)
    client.force_login(staff_user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"stickied": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['stickied'] is False


def test_update_post_nonmoderator_cant_sticky(client, private_channel_and_contributor, reddit_factories):
    """Test that a normal user cant sticky posts"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"stickied": True})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_clear_vote(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to clear the user's vote"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("just a post", user, channel=channel)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"upvoted": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_update_post_upvote(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to upvote it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, format='json', data={"upvoted": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': True,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        "edited": False,
        "stickied": False,
        'num_reports': None,
    }


def test_update_post_removed(client, staff_user, private_channel_and_contributor, reddit_factories):
    """Test updating a post to remove it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    resp = client.patch(url, format='json', data={"removed": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': True,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        "edited": False,
        "stickied": False,
        'num_reports': 0,
    }


def test_update_post_clear_removed(client, staff_user, staff_api, private_channel_and_contributor, reddit_factories):
    """Test updating a post to re-approve it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    staff_api.remove_post(post.id)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    resp = client.patch(url, format='json', data={"removed": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': False,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': 0,
    }


def test_update_post_ignore_reports(client, staff_user, staff_api, private_channel_and_contributor, reddit_factories):
    """Test updating a post to ignore reports"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    resp = client.patch(url, format='json', data={"ignore_reports": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': False,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': 0,
    }


def test_update_post_ignore_reports_forbidden(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to ignore reports with a nonstaff user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, format='json', data={"ignore_reports": True})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_removed_forbidden(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to remove with a nonstaff user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, format='json', data={"removed": True})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_forbidden(client, staff_jwt_header, private_channel_and_contributor, reddit_factories):
    """Test updating a post the user isn't the owner of"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("text", user=user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"text": "overwrite"}, **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_not_found(client, jwt_header):
    """Test updating a post that doesn't exist"""
    post_id = 'missing'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"text": "overwrite"}, **jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_create_post_without_upvote(client, private_channel_and_contributor):
    """Test creating a post without an upvote in the body"""
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'x',
        'text': 'y',
        'upvoted': False,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'x',
        'text': 'y',
        'url': None,
        'author_id': user.username,
        'created': '2017-11-22T20:19:53+00:00',
        'upvoted': False,
        'removed': False,
        'id': 'gd',
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


# Reddit doesn't indicate if a post deletion failed so we don't have tests for that
def test_delete_post(client, logged_in_profile):
    """Delete a post in a channel"""
    url = reverse('post-detail', kwargs={'post_id': '2'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT
