"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import Mock

import pytest
from praw.models.reddit.redditor import Redditor

from channels.serializers.moderators import (
    ModeratorPublicSerializer,
    ModeratorPrivateSerializer,
)
from open_discussions.factories import UserFactory


pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("is_public", [True, False])
def test_moderator(is_public):
    """Serialize of a redditor-like object"""
    serializer_cls = (
        ModeratorPublicSerializer if is_public else ModeratorPrivateSerializer
    )
    redditor = Mock(spec=Redditor)
    # the `name` attribute cannot be configured during the mock object creation
    redditor.name = "fooo_username"
    user = UserFactory.create(username=redditor.name)
    assert (
        serializer_cls(redditor).data == {"moderator_name": "fooo_username"}
        if is_public
        else {
            "moderator_name": "fooo_username",
            "full_name": user.profile.name,
            "email": user.email,
        }
    )


def test_moderator_validate_name_no_string():
    """validate the input in case the value is not a string"""
    serializer = ModeratorPrivateSerializer(data={"moderator_name": 123})
    assert serializer.is_valid() is False
    assert serializer.errors["moderator_name"][0] == "username must be a string"


def test_moderator_validate_name_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    serializer = ModeratorPrivateSerializer(data={"moderator_name": "foo_user"})
    assert serializer.is_valid() is False
    assert serializer.errors["moderator_name"][0] == "username is not a valid user"


def test_moderator_validate_name():
    """validate the input"""
    user = UserFactory.create()
    serializer = ModeratorPrivateSerializer(data={"moderator_name": user.username})
    serializer.is_valid()
    assert "moderator_name" not in serializer.errors


def test_moderator_validate_email_no_string():
    """validate the input in case the value is not a string"""
    serializer = ModeratorPrivateSerializer(data={"email": 123})
    assert serializer.is_valid() is False
    assert serializer.errors["email"][0] == "email must be a string"


def test_moderator_validate_email_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    serializer = ModeratorPrivateSerializer(data={"email": "foo_user"})
    assert serializer.is_valid() is False
    assert serializer.errors["email"][0] == "email does not exist"


def test_moderator_validate_email():
    """validate the input"""
    user = UserFactory.create()
    serializer = ModeratorPrivateSerializer(data={"email": user.email})
    serializer.is_valid()
    assert "email" not in serializer.errors


def test_moderator_create_username():
    """Adds a moderator by username"""
    user = UserFactory.create()
    moderator_user = UserFactory.create()
    moderator_redditor = Mock(spec=Redditor)
    moderator_redditor.name = moderator_user.username
    add_moderator_mock = Mock(return_value=None)
    list_moderators_mock = Mock(return_value=[moderator_redditor])
    api_mock = Mock(
        add_moderator=add_moderator_mock, _list_moderators=list_moderators_mock
    )
    channel_name = "foo_channel"
    moderator = ModeratorPrivateSerializer(
        context={
            "channel_api": api_mock,
            "request": Mock(user=user),
            "view": Mock(kwargs={"channel_name": channel_name}),
        }
    ).create({"moderator_name": moderator_user.username})
    assert moderator is moderator_redditor
    api_mock.add_moderator.assert_called_once_with(
        moderator_user.username, channel_name
    )
    list_moderators_mock.assert_called_once_with(
        channel_name=channel_name, moderator_name=moderator_user.username
    )


def test_moderator_create_email():
    """Adds a moderator by email address"""
    user = UserFactory.create()
    moderator_user = UserFactory.create()
    moderator_redditor = Mock(spec=Redditor)
    moderator_redditor.name = moderator_user.username
    add_moderator_mock = Mock(return_value=None)
    list_moderators_mock = Mock(return_value=[moderator_redditor])
    api_mock = Mock(
        add_moderator=add_moderator_mock, _list_moderators=list_moderators_mock
    )
    channel_name = "foo_channel"
    # Make sure that we're testing case insensitivity of email
    assert moderator_user.email != moderator_user.email.upper()
    moderator = ModeratorPrivateSerializer(
        context={
            "channel_api": api_mock,
            "request": Mock(user=user),
            "view": Mock(kwargs={"channel_name": channel_name}),
        }
    ).create({"email": moderator_user.email.upper()})
    assert moderator is moderator_redditor

    add_moderator_mock.assert_called_once_with(moderator_user.username, channel_name)
    list_moderators_mock.assert_called_once_with(
        channel_name=channel_name, moderator_name=moderator_user.username
    )


def test_moderator_create_both():
    """The user should only be able to specify an email address or a username"""
    user = UserFactory.create()
    moderator_user = UserFactory.create()
    moderator_redditor = Mock(spec=Redditor)
    moderator_redditor.name = moderator_user.username
    api_mock = Mock(add_moderator=Mock(return_value=moderator_redditor))
    # Make sure that we're testing case insensitivity of email
    assert moderator_user.email != moderator_user.email.upper()

    with pytest.raises(ValueError) as ex:
        ModeratorPrivateSerializer(
            context={
                "channel_api": api_mock,
                "request": Mock(user=user),
                "view": Mock(kwargs={"channel_name": "foo_channel"}),
            }
        ).create(
            {
                "email": moderator_user.email.upper(),
                "moderator_name": moderator_user.username,
            }
        )
    assert ex.value.args[0] == "Only one of moderator_name, email should be specified"


def test_moderator_create_neither():
    """The user must specify an email address or a username"""
    user = UserFactory.create()
    moderator_user = UserFactory.create()
    moderator_redditor = Mock(spec=Redditor)
    moderator_redditor.name = moderator_user.username
    api_mock = Mock(add_moderator=Mock(return_value=moderator_redditor))
    # Make sure that we're testing case insensitivity of email
    assert moderator_user.email != moderator_user.email.upper()

    with pytest.raises(ValueError) as ex:
        ModeratorPrivateSerializer(
            context={
                "channel_api": api_mock,
                "request": Mock(user=user),
                "view": Mock(kwargs={"channel_name": "foo_channel"}),
            }
        ).create({})
    assert ex.value.args[0] == "Missing moderator_name or email"
