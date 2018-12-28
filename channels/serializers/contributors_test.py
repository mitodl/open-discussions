"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import Mock

import pytest
from praw.models.reddit.redditor import Redditor

from channels.serializers.contributors import ContributorSerializer
from open_discussions.factories import UserFactory


pytestmark = pytest.mark.django_db


def test_contributor():
    """Serialize of a redditor-like object"""
    redditor = Mock(spec=Redditor)
    # the `name` attribute cannot be configured during the mock object creation
    redditor.name = "fooo_username"
    user = UserFactory.create(username=redditor.name)
    assert ContributorSerializer(redditor).data == {
        "contributor_name": "fooo_username",
        "full_name": user.profile.name,
        "email": user.email,
    }


def test_contributor_validate_name_no_string():
    """validate the input in case the value is not a string"""
    serializer = ContributorSerializer(data={"contributor_name": 123})
    assert serializer.is_valid() is False
    assert serializer.errors["contributor_name"][0] == "username must be a string"


def test_contributor_validate_name_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    serializer = ContributorSerializer(data={"contributor_name": "foo_user"})
    assert serializer.is_valid() is False
    assert serializer.errors["contributor_name"][0] == "username is not a valid user"


def test_contributor_validate_name():
    """validate the input"""
    user = UserFactory.create()
    serializer = ContributorSerializer(data={"contributor_name": user.username})
    serializer.is_valid()
    assert "contributor_name" not in serializer.errors


def test_contributor_validate_email_no_string():
    """validate the input in case the value is not a string"""
    serializer = ContributorSerializer(data={"email": 123})
    assert serializer.is_valid() is False
    assert serializer.errors["email"][0] == "email must be a string"


def test_contributor_validate_email_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    serializer = ContributorSerializer(data={"email": "foo_user"})
    assert serializer.is_valid() is False
    assert serializer.errors["email"][0] == "email does not exist"


def test_contributor_validate_email():
    """validate the input"""
    user = UserFactory.create()
    serializer = ContributorSerializer(data={"email": user.email})
    serializer.is_valid()
    assert "email" not in serializer.errors


def test_contributor_create_username():
    """Adds a contributor by username"""
    user = UserFactory.create()
    contributor_user = UserFactory.create()
    contributor_redditor = Mock(spec=Redditor)
    contributor_redditor.name = contributor_user.username
    api_mock = Mock(add_contributor=Mock(return_value=contributor_redditor))
    contributor = ContributorSerializer(
        context={
            "channel_api": api_mock,
            "request": Mock(user=user),
            "view": Mock(kwargs={"channel_name": "foo_channel"}),
        }
    ).create({"contributor_name": contributor_user.username})
    assert contributor is contributor_redditor
    api_mock.add_contributor.assert_called_once_with(
        contributor_user.username, "foo_channel"
    )


def test_contributor_create_email():
    """Adds a contributor by email address"""
    user = UserFactory.create()
    contributor_user = UserFactory.create()
    contributor_redditor = Mock(spec=Redditor)
    contributor_redditor.name = contributor_user.username
    api_mock = Mock(add_contributor=Mock(return_value=contributor_redditor))
    # Make sure that we're testing case insensitivity of email
    assert contributor_user.email != contributor_user.email.upper()
    contributor = ContributorSerializer(
        context={
            "channel_api": api_mock,
            "request": Mock(user=user),
            "view": Mock(kwargs={"channel_name": "foo_channel"}),
        }
    ).create({"email": contributor_user.email.upper()})
    assert contributor is contributor_redditor
    api_mock.add_contributor.assert_called_once_with(
        contributor_user.username, "foo_channel"
    )


def test_contributor_create_both():
    """The user should only be able to specify an email address or a username"""
    user = UserFactory.create()
    contributor_user = UserFactory.create()
    contributor_redditor = Mock(spec=Redditor)
    contributor_redditor.name = contributor_user.username
    api_mock = Mock(add_contributor=Mock(return_value=contributor_redditor))

    with pytest.raises(ValueError) as ex:
        ContributorSerializer(
            context={
                "channel_api": api_mock,
                "request": Mock(user=user),
                "view": Mock(kwargs={"channel_name": "foo_channel"}),
            }
        ).create(
            {
                "contributor_name": contributor_user.username,
                "email": contributor_user.email,
            }
        )
    assert ex.value.args[0] == "Only one of contributor_name, email should be specified"


def test_contributor_create_neither():
    """The user must specify an email address or a username"""
    user = UserFactory.create()
    contributor_user = UserFactory.create()
    contributor_redditor = Mock(spec=Redditor)
    contributor_redditor.name = contributor_user.username
    api_mock = Mock(add_contributor=Mock(return_value=contributor_redditor))

    with pytest.raises(ValueError) as ex:
        ContributorSerializer(
            context={
                "channel_api": api_mock,
                "request": Mock(user=user),
                "view": Mock(kwargs={"channel_name": "foo_channel"}),
            }
        ).create({})

    assert ex.value.args[0] == "Missing contributor_name or email"
