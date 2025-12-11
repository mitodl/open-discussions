"""Tests for moira tasks"""
import pytest

from moira_lists.factories import MoiraListFactory
from moira_lists.tasks import update_moira_list_users, update_user_moira_lists
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_update_user_moira_lists(mocker):
    """Test that the update_user_moira_lists task calls the api function of the same name"""
    mock_moira_api = mocker.patch("moira_lists.moira_api.update_user_moira_lists")
    user = UserFactory.create()
    update_user_moira_lists(user.id, update_memberships=False)
    mock_moira_api.assert_called_once_with(user)
    # update_memberships parameter is deprecated - channel memberships no longer updated


def test_update_moira_list_users(mocker):
    """Test that the update_moira_list_users task calls the api function of the same name"""
    mock_api = mocker.patch("moira_lists.moira_api.update_moira_list_users")
    moira_lists = MoiraListFactory.create_batch(3)
    update_moira_list_users([moira_list.name for moira_list in moira_lists])
    for moira_list in moira_lists:
        mock_api.assert_any_call(moira_list)
    # channel_ids parameter is deprecated - channel memberships no longer updated
