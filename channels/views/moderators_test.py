"""Tests for views for REST APIs for moderators"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.constants import NOT_AUTHENTICATED_ERROR_TYPE
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = pytest.mark.betamax


def test_list_moderators(  # pylint: disable=too-many-arguments
        user_client, private_channel_and_contributor, reddit_factories, staff_user, staff_api, settings
):
    """
    List moderators in a channel as a logged in contributor
    """
    settings.INDEXING_API_USERNAME = staff_user.username
    channel, _ = private_channel_and_contributor
    new_mod = reddit_factories.user("new_mod")
    staff_api.add_moderator(new_mod.username, channel.name)
    url = reverse('moderator-list', kwargs={'channel_name': channel.name})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    # Staff user is filtered out
    assert resp.json() == [{'moderator_name': new_mod.username}]


def test_list_moderators_staff(  # pylint: disable=too-many-arguments
        staff_client, private_channel, staff_user, staff_api, reddit_factories
):
    """
    List moderators in a channel as a staff user
    """
    mod_user = reddit_factories.user("user2")
    staff_api.add_moderator(mod_user.username, private_channel.name)
    staff_api.remove_moderator(staff_user.username, private_channel.name)
    url = reverse('moderator-list', kwargs={'channel_name': private_channel.name})
    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{
        'moderator_name': mod_user.username,
        'full_name': mod_user.profile.name,
        'email': mod_user.email,
        'can_remove': False,
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
            'moderator_name': mod_user.username,
            'full_name': mod_user.profile.name,
            'email': mod_user.email,
            'can_remove': True,
        },
        {
            'moderator_name': staff_user.username,
            'full_name': staff_user.profile.name,
            'email': staff_user.email,
            'can_remove': False,
        }
    ]


def test_list_moderators_many_moderator(client, private_channel, staff_user, staff_api, reddit_factories):
    """
    List moderators in a channel as a logged in moderator of that channel
    """
    url = reverse('moderator-list', kwargs={'channel_name': private_channel.name})

    mod_users = []
    for i in range(10):
        mod_user = reddit_factories.user(f"user{i}")
        staff_api.add_moderator(mod_user.username, private_channel.name)
        mod_users.append(mod_user)
    logged_in_user_index = 9
    client.force_login(mod_users[logged_in_user_index])
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            'moderator_name': mod_users[9].username,
            'full_name': mod_users[9].profile.name,
            'email': mod_users[9].email,
            'can_remove': True
        },
        {
            'moderator_name': staff_user.username,
            'full_name': staff_user.profile.name,
            'email': staff_user.email,
            'can_remove': False,
        },
        *[
            {
                'moderator_name': mod_user.username,
                'full_name': mod_user.profile.name,
                'email': mod_user.email,
                'can_remove': i >= logged_in_user_index
            }
            for i, mod_user in enumerate(mod_users[:9])
        ],
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
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
        assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE


def test_add_moderator(staff_client, public_channel, reddit_factories):
    """
    Adds a moderator to a channel
    """
    moderator = reddit_factories.user("new_mod_user")
    url = reverse('moderator-list', kwargs={'channel_name': public_channel.name})
    resp = staff_client.post(url, data={'moderator_name': moderator.username}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'moderator_name': moderator.username,
        'email': moderator.email,
        'full_name': moderator.profile.name,
        'can_remove': True,
    }


def test_add_moderator_email(staff_client, public_channel, reddit_factories):
    """
    Adds a moderator to a channel by email
    """
    new_mod_user = reddit_factories.user("new_mod_user")

    url = reverse('moderator-list', kwargs={'channel_name': public_channel.name})
    resp = staff_client.post(url, data={'email': new_mod_user.email}, format='json')

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'moderator_name': new_mod_user.username,
        'email': new_mod_user.email,
        'full_name': new_mod_user.profile.name,
        'can_remove': True,
    }


def test_add_moderator_again(staff_client, public_channel, staff_api, reddit_factories):
    """
    If a user is already a moderator we should return 201 without making any changes
    """
    moderator = reddit_factories.user("already_mod")
    staff_api.add_moderator(moderator.username, public_channel.name)
    url = reverse('moderator-list', kwargs={'channel_name': public_channel.name})
    resp = staff_client.post(url, data={'moderator_name': moderator.username}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'moderator_name': moderator.username,
        'email': moderator.email,
        'full_name': moderator.profile.name,
        'can_remove': True,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_add_moderator_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't add moderators"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('moderator-list', kwargs={'channel_name': 'a_channel'})
    resp = client.post(url, data={'moderator_name': 'some_moderator'}, format='json')
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE


def test_remove_moderator(staff_client):
    """
    Removes a moderator from a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = staff_client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator_again(staff_client):
    """
    If a user is already not a moderator for a channel we should return a 403, signaling that the user does not have
    permission to remove that user as a moderator.
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = staff_client.delete(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_remove_moderator_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't add moderators"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('moderator-detail', kwargs={'channel_name': 'a_channel', 'moderator_name': 'doesnt_matter'})
    resp = client.delete(url, data={'moderator_name': 'some_moderator'}, format='json')
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE
