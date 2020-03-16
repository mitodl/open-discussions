"""Moira list utility function tests"""
from tempfile import NamedTemporaryFile

import pytest
from django.contrib.auth.models import AnonymousUser, User
from zeep.exceptions import Fault

from moira_lists.exceptions import MoiraException
from moira_lists.factories import MoiraListFactory
from moira_lists.models import MoiraList
from moira_lists.moira_api import (
    user_moira_lists,
    get_moira_client,
    query_moira_lists,
    update_user_moira_lists,
    moira_user_emails,
    update_moira_list_users,
)
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "key_file, cert_file",
    [(NamedTemporaryFile(), None), (None, NamedTemporaryFile()), (None, None)],
)
def test_get_moira_client_missing_secrets(mock_moira, settings, key_file, cert_file):
    """Test that the correct error is returned if a key file is missing"""
    settings.MIT_WS_PRIVATE_KEY_FILE = (
        "bad/file/path" if not key_file else key_file.name
    )
    settings.MIT_WS_CERTIFICATE_FILE = (
        "bad/file/path" if not cert_file else cert_file.name
    )
    with pytest.raises(RuntimeError) as err:
        get_moira_client()
        assert not mock_moira.called
        if key_file is None:
            assert settings.MIT_WS_PRIVATE_KEY_FILE in str(err)
        if cert_file is None:
            assert settings.MIT_WS_CERTIFICATE_FILE in str(err)


def test_get_moira_client_success(mock_moira, settings):
    """Test that a client is returned from get_moira_client"""
    tempfile1, tempfile2 = (NamedTemporaryFile(), NamedTemporaryFile())
    settings.MIT_WS_PRIVATE_KEY_FILE = tempfile1.name
    settings.MIT_WS_CERTIFICATE_FILE = tempfile2.name
    get_moira_client()
    assert mock_moira.called_once_with(
        settings.MIT_WS_CERTIFICATE_FILE, settings.MIT_WS_PRIVATE_KEY_FILE
    )


def test_query_moira_lists(mock_moira_client):
    """
    Test that expected lists are returned.
    """
    list_names = ["test_moira_list01", "test_moira_list02"]
    mock_moira_client.return_value.user_list_membership.return_value = [
        {"listName": list_name} for list_name in list_names
    ]
    other_user = UserFactory(email="someone@mit.edu")
    assert query_moira_lists(other_user) == list_names


def test_query_moira_lists_no_lists(mock_moira_client):
    """
    Test that an empty list is returned if Moira throws a java NPE
    """
    mock_moira_client.return_value.user_list_membership.side_effect = Fault(
        "java.lang.NullPointerException"
    )
    other_user = UserFactory(email="someone@mit.edu")
    assert query_moira_lists(other_user) == []


def test_query_moira_lists_error(mock_moira_client):
    """
    Test that a Moira exception is raised if moira client call fails with anything other than a java NPE
    """
    mock_moira_client.return_value.user_list_membership.side_effect = Fault(
        "Not a java NPE"
    )
    with pytest.raises(MoiraException):
        query_moira_lists(UserFactory())


def test_user_moira_lists(mocker):
    """
    Test that expected list is returned for a user
    """
    user = UserFactory.create()
    mock_lists = ["test.list.1", "test.list.2"]
    mock_query_moira_lists = mocker.patch(
        "moira_lists.moira_api.query_moira_lists", return_value=mock_lists
    )

    assert user_moira_lists(user) == set(mock_lists)
    mock_query_moira_lists.assert_called_once_with(user)


def test_user_moira_lists_anonymous():
    """
    Test that empty list is returned for anonymous user
    """
    assert user_moira_lists(AnonymousUser()) == []


def test_moira_user_emails():
    """Test that moira_user_emails returns expected list of emails"""
    inlist = ["test1", "Te.st.2", "test@test.edu", "tester@mit.edu"]
    expected = ["test1@mit.edu", "Te.st.2@mit.edu", "test@test.edu", "tester@mit.edu"]
    assert moira_user_emails(inlist) == expected


def test_update_user_moira_lists(mocker):
    """Test that update_user_moira_lists updates the user's related moira lists """
    moira_user = UserFactory.create()
    user_lists = ["test.list.1", "test.list.2"]
    mocker.patch("moira_lists.moira_api.query_moira_lists", return_value=user_lists)

    moira_list_3 = MoiraListFactory.create(name="test.list.3", users=[moira_user])
    assert list(moira_list_3.users.all()) == [moira_user]
    assert list(moira_user.moira_lists.all()) == [moira_list_3]

    update_user_moira_lists(moira_user)

    assert (
        list(
            User.objects.get(id=moira_user.id)
            .moira_lists.order_by("name")
            .values_list("name", flat=True)
        )
        == user_lists
    )
    for name in user_lists:
        assert list(MoiraList.objects.get(name=name).users.all()) == [moira_user]
    assert list(MoiraList.objects.get(name=moira_list_3.name).users.all()) == []
    assert (
        list(
            moira_user.moira_lists.order_by("name").all().values_list("name", flat=True)
        )
        == user_lists
    )


def test_update_moira_list_users(mock_moira_client):
    """ Test that update_moira_list_users updates the moira lists' users"""
    moira_users = UserFactory.create_batch(3)
    moira_list = MoiraListFactory.create(users=[moira_users[2]])
    assert list(moira_list.users.all()) == [moira_users[2]]
    mock_moira_client.return_value.list_members.return_value = [
        user.email for user in moira_users[:2]
    ]
    update_moira_list_users(moira_list)
    assert list(moira_list.users.order_by("id")) == sorted(
        moira_users[:2], key=lambda user: user.id
    )
