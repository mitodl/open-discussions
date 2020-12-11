"""Tests for notification views"""
# pylint: disable=redefined-outer-name, unused-argument
from operator import itemgetter

import pytest
from django.urls import reverse
from rest_framework import status

from channels.factories.models import ChannelFactory
from notifications.factories import NotificationSettingsFactory
from notifications.models import (
    FREQUENCIES,
    NOTIFICATION_TYPES,
    NOTIFICATION_TYPE_MODERATOR,
    NOTIFICATION_TYPE_COMMENTS,
    NOTIFICATION_TYPE_FRONTPAGE,
)


def _sort_settings(settings):
    """Sort settings by notification_type"""
    return sorted(settings, key=itemgetter("notification_type"))


def test_list_notification_settings_unauthenticated(client):
    """Tests that a get on notification settings returns forbidden if unauthenticated"""
    response = client.get(reverse("notification_settings-list"))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_notification_settings_list_empty(user, client):
    """Tests that the notifications settings returns an empty list for a new user"""
    client.force_login(user)
    response = client.get(reverse("notification_settings-list"))
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


@pytest.mark.parametrize("channel_moderator_notifications", [True, False])
def test_notification_settings_list(
    user, client, mocker, channel_moderator_notifications
):
    """Tests that the notifications settings returns the user's notification settings"""
    channel = ChannelFactory.create(
        moderator_notifications=channel_moderator_notifications
    )

    settings = [
        NotificationSettingsFactory.create(
            user=user, notification_type=notification_type
        )
        for notification_type in [
            NOTIFICATION_TYPE_COMMENTS,
            NOTIFICATION_TYPE_FRONTPAGE,
        ]
    ]

    moderator_setting = NotificationSettingsFactory.create(
        user=user, notification_type=NOTIFICATION_TYPE_MODERATOR, channel=channel
    )

    if channel_moderator_notifications:
        settings.append(moderator_setting)

    client.force_login(user)
    response = client.get(reverse("notification_settings-list"))
    assert response.status_code == status.HTTP_200_OK
    assert _sort_settings(response.json()) == _sort_settings(
        [
            {
                "trigger_frequency": setting.trigger_frequency,
                "notification_type": setting.notification_type,
                "channel_name": setting.channel.name if setting.channel else None,
                "channel_title": setting.channel.title if setting.channel else None,
            }
            for setting in settings
        ]
    )


@pytest.mark.parametrize("notification_type", NOTIFICATION_TYPES)
def test_notification_settings_get(user, client, notification_type):
    """Tests that the notifications settings returns a specific notification settings"""
    if notification_type == NOTIFICATION_TYPE_MODERATOR:
        channel = ChannelFactory.create(moderator_notifications=True)
        setting = NotificationSettingsFactory.create(
            user=user, notification_type=notification_type, channel=channel
        )
        args = {"channel_name": channel.name}
    else:
        setting = NotificationSettingsFactory.create(
            user=user, notification_type=notification_type
        )
        args = {}

    client.force_login(user)
    url = reverse(
        "notification_settings-detail", kwargs={"notification_type": notification_type}
    )
    response = client.get(url, args)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "trigger_frequency": setting.trigger_frequency,
        "notification_type": notification_type,
        "channel_name": setting.channel.name if setting.channel else None,
        "channel_title": setting.channel.title if setting.channel else None,
    }


@pytest.mark.parametrize("notification_type", NOTIFICATION_TYPES)
def test_notification_settings_get_unauthenticated(client, notification_type):
    """Tests that a get on a specific setting returns forbidden if unauthenticated"""
    url = reverse(
        "notification_settings-detail", kwargs={"notification_type": notification_type}
    )
    response = client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("notification_type", NOTIFICATION_TYPES)
@pytest.mark.parametrize("trigger_frequency", FREQUENCIES)
def test_notification_settings_patch(
    user, client, trigger_frequency, notification_type
):
    """Tests that the notifications settings returns a specific notification settings"""
    if notification_type == NOTIFICATION_TYPE_MODERATOR:
        channel = ChannelFactory.create(moderator_notifications=True)
        setting = NotificationSettingsFactory.create(
            user=user, notification_type=notification_type, channel=channel
        )
        args = {"trigger_frequency": trigger_frequency, "channel_name": channel.name}
    else:
        setting = NotificationSettingsFactory.create(
            user=user, notification_type=notification_type
        )
        args = {"trigger_frequency": trigger_frequency}
    client.force_login(user)
    url = reverse(
        "notification_settings-detail", kwargs={"notification_type": notification_type}
    )
    response = client.patch(url, args)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "trigger_frequency": trigger_frequency,
        "notification_type": notification_type,
        "channel_name": setting.channel.name if setting.channel else None,
        "channel_title": setting.channel.title if setting.channel else None,
    }


@pytest.mark.parametrize("notification_type", NOTIFICATION_TYPES)
@pytest.mark.parametrize("trigger_frequency", FREQUENCIES)
def test_notification_settings_patch_unauthenticated(
    client, trigger_frequency, notification_type
):
    """Tests that a patch on a specific setting returns forbidden if unauthenticated"""
    url = reverse(
        "notification_settings-detail", kwargs={"notification_type": notification_type}
    )
    response = client.patch(url, {"trigger_frequency": trigger_frequency})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
