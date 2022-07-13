"""Tests for membership api"""
import pytest

from channels.factories.models import ChannelFactory, ChannelMembershipConfigFactory
from channels.membership_api import (
    update_memberships_for_managed_channels,
    update_memberships_for_managed_channel,
)
from open_discussions.factories import UserFactory
from profiles.models import Profile

pytestmark = pytest.mark.django_db


def test_update_memberships_for_managed_channels(mocker):
    """
    Verify that update_memberships_for_managed_channels() calls
    update_memberships_for_managed_channel() with configured channels
    """
    # channels with no configs, shouldn't be used
    ChannelFactory.create(membership_is_managed=True)
    ChannelFactory.create(membership_is_managed=False)

    # channels with configs, only managed one should be used
    managed_channel1 = ChannelFactory.create(membership_is_managed=True)
    managed_channel1.channel_membership_configs.add(
        ChannelMembershipConfigFactory.create()
    )
    managed_channel2 = ChannelFactory.create(membership_is_managed=True)
    managed_channel2.channel_membership_configs.add(
        ChannelMembershipConfigFactory.create()
    )
    nonmanaged_channel = ChannelFactory.create(membership_is_managed=False)
    nonmanaged_channel.channel_membership_configs.add(
        ChannelMembershipConfigFactory.create()
    )

    mock_update_memberships_for_managed_channel = mocker.patch(
        "channels.membership_api.update_memberships_for_managed_channel", autospec=True
    )

    update_memberships_for_managed_channels(
        channel_ids=[managed_channel1.id], user_ids=[1, 2, 3]
    )

    mock_update_memberships_for_managed_channel.assert_called_once_with(
        managed_channel1, user_ids=[1, 2, 3]
    )


@pytest.mark.usefixtures("indexing_user")
@pytest.mark.parametrize("is_managed", [True, False])
@pytest.mark.parametrize("has_configs", [True, False])
def test_update_memberships_for_managed_channel(mocker, is_managed, has_configs):
    """ "Verifies that update_memberships_for_managed_channel() adds matching users as members to a channel"""
    mock_api = mocker.patch("channels.api.Api", autospec=True).return_value
    channel = ChannelFactory.create(membership_is_managed=is_managed)
    if has_configs:
        channel.channel_membership_configs.add(
            ChannelMembershipConfigFactory.create(
                query={"email__endswith": "@matching.email"}
            )
        )

    user = UserFactory.create(email="user@matching.email", is_active=True)
    UserFactory.create(email="user2@matching.email", is_active=True)
    UserFactory.create(email="user3@matching.email", is_active=False)

    update_memberships_for_managed_channel(channel, user_ids=[user.id])

    if is_managed and has_configs:
        mock_api.add_subscriber.assert_called_once_with(user.username, channel.name)
        mock_api.add_contributor.assert_called_once_with(user.username, channel.name)
    else:
        mock_api.add_subscriber.assert_not_called()
        mock_api.add_contributor.assert_not_called()


@pytest.mark.usefixtures("indexing_user")
def test_update_memberships_for_managed_channel_missing_profile(mocker):
    """Verify that an exception is logged if a profile is missing for a user"""
    mock_api = mocker.patch("channels.api.Api", autospec=True).return_value
    mock_api.add_contributor.side_effect = Profile.DoesNotExist
    user = UserFactory.create(email="user@matching.email", is_active=True, profile=None)
    channel = ChannelFactory.create(membership_is_managed=True)
    channel.channel_membership_configs.add(
        ChannelMembershipConfigFactory.create(
            query={"email__endswith": "@matching.email"}
        )
    )

    update_memberships_for_managed_channel(channel, user_ids=[user.id])

    mock_log = mocker.patch("channels.membership_api.log.exception")
    update_memberships_for_managed_channel(channel, user_ids=[user.id])
    mock_log.assert_called_once_with(
        "Channel %s membership update failed due to missing user profile: %s",
        channel.name,
        user.username,
    )


@pytest.mark.usefixtures("indexing_user")
def test_update_memberships_for_managed_channel_empty_queries(mocker):
    """Verifies that update_memberships_for_managed_channel() bails if the queries would return all users"""
    mock_api = mocker.patch("channels.api.Api", autospec=True).return_value
    channel = ChannelFactory.create(membership_is_managed=True)
    channel.channel_membership_configs.add(
        ChannelMembershipConfigFactory.create(
            query={}  # an empty query should match all users
        )
    )

    UserFactory.create(is_active=True)  # this user will match the `active_users` query

    update_memberships_for_managed_channel(channel)

    mock_api.add_subscriber.assert_not_called()
    mock_api.add_contributor.assert_not_called()
