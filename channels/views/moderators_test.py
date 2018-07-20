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
    List moderators in a channel as a logged in contributor
    """
    channel, user = private_channel_and_contributor
    url = reverse('moderator-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'moderator_name': staff_user.username}]


def test_list_moderators_staff(  # pylint: disable=too-many-arguments
        client, private_channel, staff_user, staff_api, reddit_factories, staff_jwt_header
):
    """
    List moderators in a channel as a staff user
    """
    mod_user = reddit_factories.user("user2")
    staff_api.add_moderator(mod_user.username, private_channel.name)
    staff_api.remove_moderator(staff_user.username, private_channel.name)
    url = reverse('moderator-list', kwargs={'channel_name': private_channel.name})
    client.force_login(staff_user)
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{
        'moderator_name': mod_user.username,
        'full_name': mod_user.profile.name,
        'email': mod_user.email,
    }]


def test_list_moderators_moderator(client, private_channel, staff_user, staff_api, reddit_factories):
    """
    List moderators in a channel as a logged in moderator of that channel
    """
    url = reverse('moderator-list', kwargs={'channel_name': private_channel.name})
    mod_user = reddit_factories.user("user2")
    staff_api.add_moderator(mod_user.username, private_channel.name)
    client.force_login(mod_user)
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            'moderator_name': staff_user.username,
            'full_name': staff_user.profile.name,
            'email': staff_user.email,
        },
        {
            'moderator_name': mod_user.username,
            'full_name': mod_user.profile.name,
            'email': mod_user.email,
        }
    ]


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
    assert resp.json() == {
        'moderator_name': moderator.username,
        'email': moderator.email,
        'full_name': moderator.profile.name,
    }


def test_add_moderator_email(client, public_channel, staff_jwt_header, staff_api, reddit_factories):
    """
    Adds a moderator to a channel by email
    """
    existing_mod_user = reddit_factories.user("mod_user1")
    new_mod_user = reddit_factories.user("new_mod_user")
    staff_api.add_moderator(existing_mod_user.username, public_channel.name)
    client.force_login(existing_mod_user)

    url = reverse('moderator-list', kwargs={'channel_name': public_channel.name})
    resp = client.post(url, data={'email': new_mod_user.email}, format='json', **staff_jwt_header)

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'moderator_name': new_mod_user.username,
        'email': new_mod_user.email,
        'full_name': new_mod_user.profile.name,
    }


def test_add_moderator_again(client, staff_jwt_header):
    """
    If a user is already a moderator we should return 201 without making any changes
    """
    moderator = UserFactory.create(username='already_mod')
    url = reverse('moderator-list', kwargs={'channel_name': 'a_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'moderator_name': moderator.username,
        'email': moderator.email,
        'full_name': moderator.profile.name,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_add_moderator_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't add moderators"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
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
    If a user is already not a moderator for a channel we should return a 403, signaling that the user does not have
    permission to remove that user as a moderator.
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_remove_moderator_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't add moderators"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('moderator-detail', kwargs={'channel_name': 'a_channel', 'moderator_name': 'doesnt_matter'})
    resp = client.delete(url, data={'moderator_name': 'some_moderator'}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
