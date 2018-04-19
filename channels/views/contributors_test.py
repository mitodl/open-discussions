"""Tests for views for REST APIs for contributors"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.factories import UserFactory

pytestmark = pytest.mark.betamax


def test_list_contributors(client, logged_in_profile):
    """
    List contributors in a channel
    """
    url = reverse('contributor-list', kwargs={'channel_name': 'test_channel'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'contributor_name': 'othercontributor'}, {'contributor_name': 'fooadmin'}]


def test_list_contributors_anonymous(client):
    """Anonymous users can't list contributors in a channel"""
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
    assert resp.json() == {'contributor_name': contributor.username}


def test_add_contributor_again(client, staff_jwt_header):
    """
    If the user is already a contributor a 201 status should be returned
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'contributor_name': contributor.username}


def test_add_contributor_anonymous(client):
    """
    Anonymous users can't add contributors to a channel
    """
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': 'some_username'}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_detail_contributor_error(client):
    """
    Detail of a contributor in a channel in case the user is not a contributor
    """
    admin = UserFactory.create(username='fooadmin')
    client.force_login(admin)
    nocontributor = UserFactory.create(username='nocontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': nocontributor.username})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_detail_contributor(client):
    """
    Detail of a contributor in a channel
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    contributor = UserFactory.create(username='othercontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': contributor.username})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {'contributor_name': 'othercontributor'}


def test_detail_contributor_anonymous(client):
    """
    Anonymous users can't see information about a contributor
    """
    url = reverse('contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': 'contributor'})
    resp = client.get(url, data={'contributor_name': 'some_username'}, format='json')
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


def test_remove_contributor_anonymous(client):
    """Anonymous users can't remove contributors"""
    url = reverse('contributor-detail', kwargs={'channel_name': 'a_channel', 'contributor_name': 'a_contributor'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
