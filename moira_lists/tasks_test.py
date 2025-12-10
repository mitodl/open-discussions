"""Tests for moira tasks"""
import pytest

from moira_lists.factories import MoiraListFactory
from moira_lists.tasks import update_moira_list_users, update_user_moira_lists
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("update_memberships", [True, False])
def test_update_user_moira_lists(mocker, update_memberships):
    """Test that the update_user_moira_lists task calls the api function of the same name"""
    mock_moira_api = mocker.patch("moira_lists.moira_api.update_user_moira_lists")
    mock_member_api = mocker.patch(
        "moira_lists.tasks.update_memberships_for_managed_channels"
    )
    user = UserFactory.create()
    update_user_moira_lists(user.id, update_memberships=update_memberships)
    mock_moira_api.assert_called_once_with(user)
    if update_memberships:
        mock_member_api.assert_called_once_with(user_ids=[user.id])
    else:
        mock_member_api.assert_not_called()


@pytest.mark.parametrize("channel_ids", [None, [1, 2]])
def test_update_moira_list_users(mocker, channel_ids):
    """Test that the update_moira_list_users task calls the api function of the same name"""
    mock_api = mocker.patch("moira_lists.moira_api.update_moira_list_users")
    mock_member_api = mocker.patch(
        "moira_lists.tasks.update_memberships_for_managed_channels"
    )
    moira_lists = MoiraListFactory.create_batch(3)
    update_moira_list_users(
        [moira_list.name for moira_list in moira_lists], channel_ids=channel_ids
    )
    for moira_list in moira_lists:
        mock_api.assert_any_call(moira_list)
    if channel_ids is not None:
        mock_member_api.assert_called_once_with(channel_ids=channel_ids)
    else:
        mock_member_api.assert_not_called()
