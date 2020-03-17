"""Testd for channel models"""
import pytest

from channels.factories.models import ChannelMembershipConfigFactory
from open_discussions import features


@pytest.mark.django_db
@pytest.mark.parametrize("moira_enabled", [True, False])
@pytest.mark.parametrize(
    "query,list_count",
    [
        [{"email__iendswith": "@.mit.edu"}, 0],
        [{"moira_lists": ["list1"]}, 1],
        [{"moira_lists": ["list1", "list2"]}, 2],
    ],
)
def test_channel_membership_config_save(
    mocker, settings, query, list_count, moira_enabled
):
    """Test that update_moira_list_users is called for every moira list in the config"""
    settings.FEATURES[features.MOIRA] = moira_enabled
    mock_update_moira = mocker.patch("moira_lists.tasks.update_moira_list_users.delay")
    ChannelMembershipConfigFactory.create(query=query)
    assert mock_update_moira.call_count == (list_count if moira_enabled else 0)
