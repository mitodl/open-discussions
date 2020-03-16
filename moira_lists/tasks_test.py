""" Tests for moira tasks"""
import pytest

from moira_lists.tasks import update_moira_list_users, update_user_moira_lists
from moira_lists.factories import MoiraListFactory
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_update_user_moira_lists(mocker):
    """Test that the update_user_moira_lists task calls the api function of the same name"""
    mock_api = mocker.patch("moira_lists.moira_api.update_user_moira_lists")
    user = UserFactory.create()
    update_user_moira_lists(user.id)
    mock_api.assert_called_once_with(user)


def test_update_moira_list_users(mocker):
    """Test that the update_moira_list_users task calls the api function of the same name"""
    mock_api = mocker.patch("moira_lists.moira_api.update_moira_list_users")
    moira_list = MoiraListFactory.create()
    update_moira_list_users(moira_list.name)
    mock_api.assert_called_once_with(moira_list)
