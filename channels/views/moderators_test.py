"""Tests for views for REST APIs for moderators"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = pytest.mark.betamax


def test_list_moderators(client, private_channel_and_contributor, staff_user):
    """
    List moderators in a channel
    """
    channel, user = private_channel_and_contributor
    url = reverse('moderator-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'moderator_name': staff_user.username}]


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_list_moderators_anonymous(client, public_channel, staff_user, settings, allow_anonymous):
    """Anonymous users should see the moderator list"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('moderator-list', kwargs={'channel_name': public_channel.name})
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == [{'moderator_name': staff_user.username}]
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_add_moderator(client, staff_jwt_header):
    """
    Adds a moderator to a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('moderator-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'moderator_name': moderator.username}


def test_add_moderator_again(client, staff_jwt_header):
    """
    If a user is already a moderator we should return 201 without making any changes
    """
    moderator = UserFactory.create(username='already_mod')
    url = reverse('moderator-list', kwargs={'channel_name': 'a_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'moderator_name': moderator.username}


def test_add_moderator_anonymous(client):
    """Anonymous users can't add moderators"""
    url = reverse('moderator-list', kwargs={'channel_name': 'a_channel'})
    resp = client.post(url, data={'moderator_name': 'some_moderator'}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_remove_moderator(client, staff_jwt_header):
    """
    Removes a moderator from a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator_again(client, staff_jwt_header):
    """
    If a user is already not a moderator for a channel we should still return a 204
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator_anonymous(client):
    """Anonymous users can't add moderators"""
    url = reverse('moderator-detail', kwargs={'channel_name': 'a_channel', 'moderator_name': 'doesnt_matter'})
    resp = client.delete(url, data={'moderator_name': 'some_moderator'}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
