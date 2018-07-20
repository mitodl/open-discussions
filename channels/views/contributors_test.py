"""Tests for views for REST APIs for contributors"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = pytest.mark.betamax


def test_list_contributors(client, private_channel_and_contributor, staff_user, staff_jwt_header):
    """
    List contributors in a channel
    """
    channel, user = private_channel_and_contributor
    url = reverse('contributor-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{
        'contributor_name': user.username,
        'full_name': user.profile.name,
        'email': user.email,
    }, {
        'contributor_name': staff_user.username,
        'full_name': staff_user.profile.name,
        'email': staff_user.email,
    }]


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_list_contributors_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't list contributors in a channel"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    # Well, maybe we could allow it but there's no point since this list is only meaningful for private channels.
    url = reverse('contributor-list', kwargs={'channel_name': 'some_channel'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_add_contributor(client, staff_jwt_header):
    """
    Adds a contributor to a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'contributor_name': contributor.username,
        'full_name': contributor.profile.name,
        'email': contributor.email,
    }


def test_add_contributor_email(client, public_channel, staff_jwt_header, staff_api, reddit_factories):
    """
    Adds a contributor to a channel by email
    """
    moderator = reddit_factories.user("mod_user1")
    new_contributor = reddit_factories.user("new_mod_user")
    staff_api.add_moderator(moderator.username, public_channel.name)
    client.force_login(moderator)

    url = reverse('contributor-list', kwargs={'channel_name': public_channel.name})
    resp = client.post(url, data={'email': new_contributor.email}, format='json', **staff_jwt_header)

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'contributor_name': new_contributor.username,
        'email': new_contributor.email,
        'full_name': new_contributor.profile.name,
    }


def test_add_contributor_again(client, staff_jwt_header):
    """
    If the user is already a contributor a 201 status should be returned
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'contributor_name': contributor.username,
        'full_name': contributor.profile.name,
        'email': contributor.email,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_add_contributor_anonymous(client, settings, allow_anonymous):
    """
    Anonymous users can't add contributors to a channel
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': 'some_username'}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_remove_contributor(client, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_contributor_again(client, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_remove_contributor_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't remove contributors"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('contributor-detail', kwargs={'channel_name': 'a_channel', 'contributor_name': 'a_contributor'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
