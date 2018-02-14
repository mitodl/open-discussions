"""Tests for notification views"""
from operator import itemgetter

import pytest
from django.core.urlresolvers import reverse
from rest_framework import status

from notifications.factories import NotificationSettingsFactory
from notifications.models import (
    FREQUENCIES,
    NOTIFICATION_TYPES,
)


def _sort_settings(settings):
    """Sort settings by notification_type"""
    return sorted(settings, key=itemgetter('notification_type'))


def test_list_notification_settings_unauthenticated(client):
    """Tests that a get on notification settings returns forbidden if unauthenticated"""
    response = client.get(reverse('notification_settings-list'))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_notification_settings_list_empty(user, client):
    """Tests that the notifications settings returns an empty list for a new user"""
    client.force_login(user)
    response = client.get(reverse('notification_settings-list'))
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_notification_settings_list(user, client):
    """Tests that the notifications settings returns the user's notification settings"""
    settings = [
        NotificationSettingsFactory.create(user=user, notification_type=notification_type)
        for notification_type in NOTIFICATION_TYPES
    ]
    client.force_login(user)
    response = client.get(reverse('notification_settings-list'))
    assert response.status_code == status.HTTP_200_OK
    assert _sort_settings(response.json()) == _sort_settings([{
        'trigger_frequency': setting.trigger_frequency,
        'notification_type': setting.notification_type,
    } for setting in settings])


@pytest.mark.parametrize('notification_type', NOTIFICATION_TYPES)
def test_notification_settings_get(user, client, notification_type):
    """Tests that the notifications settings returns a specific notification settings"""
    setting = NotificationSettingsFactory.create(user=user, notification_type=notification_type)
    client.force_login(user)
    url = reverse(
        'notification_settings-detail',
        kwargs={'notification_type': notification_type},
    )
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        'trigger_frequency': setting.trigger_frequency,
        'notification_type': notification_type,
    }


@pytest.mark.parametrize('notification_type', NOTIFICATION_TYPES)
def test_notification_settings_get_unauthenticated(client, notification_type):
    """Tests that a get on a specific setting returns forbidden if unauthenticated"""
    url = reverse(
        'notification_settings-detail',
        kwargs={'notification_type': notification_type},
    )
    response = client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize('notification_type', NOTIFICATION_TYPES)
@pytest.mark.parametrize('trigger_frequency', FREQUENCIES)
def test_notification_settings_patch(user, client, trigger_frequency, notification_type):
    """Tests that the notifications settings returns a specific notification settings"""
    NotificationSettingsFactory.create(user=user, notification_type=notification_type)
    client.force_login(user)
    url = reverse(
        'notification_settings-detail',
        kwargs={'notification_type': notification_type},
    )
    response = client.patch(url, {
        'trigger_frequency': trigger_frequency,
    })
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        'trigger_frequency': trigger_frequency,
        'notification_type': notification_type,
    }


@pytest.mark.parametrize('notification_type', NOTIFICATION_TYPES)
@pytest.mark.parametrize('trigger_frequency', FREQUENCIES)
def test_notification_settings_patch_unauthenticated(client, trigger_frequency, notification_type):
    """Tests that a patch on a specific setting returns forbidden if unauthenticated"""
    url = reverse(
        'notification_settings-detail',
        kwargs={'notification_type': notification_type},
    )
    response = client.patch(url, {
        'trigger_frequency': trigger_frequency,
    })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
