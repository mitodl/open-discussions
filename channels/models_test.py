"""Tests for channel models"""
import pytest

from channels.factories.models import ChannelMembershipConfigFactory, ChannelFactory
from open_discussions import features


@pytest.mark.django_db
@pytest.mark.parametrize("moira_enabled", [True, False])
@pytest.mark.parametrize(
    "query",
    [
        {"email__iendswith": "@.mit.edu"},
        {"moira_lists": ["list1"]},
        {"moira_lists": ["list1", "list2"]},
    ],
)
def test_channel_membership_config_save(mocker, settings, query, moira_enabled):
    """Test that update_moira_list_users is called for every moira list in the config"""
    settings.FEATURES[features.MOIRA] = moira_enabled
    mock_update_moira = mocker.patch("moira_lists.tasks.update_moira_list_users.delay")
    channel = ChannelFactory.create(membership_is_managed=True)
    config = ChannelMembershipConfigFactory.create()
    channel.channel_membership_configs.add(config)
    config.query = query
    config.save()
    if moira_enabled and "moira_lists" in query:
        mock_update_moira.assert_called_once_with(
            query["moira_lists"], channel_ids=[channel.id]
        )
    else:
        mock_update_moira.assert_not_called()
