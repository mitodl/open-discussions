"""Tests for views for REST APIs for channels"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.factories import UserFactory

pytestmark = pytest.mark.betamax


def test_list_subscribers_not_allowed(client, staff_jwt_header):
    """
    Get method not allowed on the list of subscribers
    """
    url = reverse('subscriber-list', kwargs={'channel_name': 'test_channel'})
    assert client.get(url, **staff_jwt_header).status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_add_subscriber(client, staff_jwt_header):
    """
    Adds a subscriber to a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_add_subscriber_again(client, staff_jwt_header):
    """
    If a user is already part of a channel we should return a 201 status
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_add_subscriber_forbidden(client, staff_jwt_header):
    """
    If a user gets a 403 from praw we should return a 403 status
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_add_subscriber_anonymous(client):
    """
    Anonymous users can't add subscribers
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_detail_subscriber(client, staff_jwt_header):
    """
    Detail of a subscriber in a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_detail_subscriber_missing(client):
    """
    A missing subscriber should generate a 404
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    client.force_login(subscriber)
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username}
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_detail_subscriber_anonymous(client):
    """Anonymous users can't see subscriber information"""
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_remove_subscriber(client, staff_jwt_header):
    """
    Removes a subscriber from a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber_again(client, staff_jwt_header):
    """
    The API should return a 204 even if the user isn't there
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber_anonymous(client):
    """Anonymous users can't remove subscribers"""
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
