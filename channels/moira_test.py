"""Moira list utility function tests"""
from tempfile import NamedTemporaryFile

import pytest
from django.contrib.auth.models import AnonymousUser
from zeep.exceptions import Fault

from channels.exceptions import MoiraException
from channels.moira import (
    user_moira_lists,
    get_moira_client,
    write_to_file,
    query_moira_lists,
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


def test_write_to_file():
    """Test that write_to_file creates a file with the correct contents"""
    content = b"-----BEGIN CERTIFICATE-----\nMIID5DCCA02gAwIBAgIRTUTVwsj4Vy+l6+XTYjnIQ==\n-----END CERTIFICATE-----"
    with NamedTemporaryFile() as outfile:
        write_to_file(outfile.name, content)
        with open(outfile.name, "rb") as infile:
            assert infile.read() == content


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


def test_user_moira_lists_anonymous():
    """
    Test that empty list is returned for anonymous user
    """
    assert user_moira_lists(AnonymousUser()) == []
