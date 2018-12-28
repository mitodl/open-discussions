"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import Mock

import pytest
from rest_framework.exceptions import ValidationError

from channels.api import sync_channel_subscription_model
from channels.factories import ChannelFactory
from channels.serializers.subscribers import SubscriberSerializer
from open_discussions.factories import UserFactory


pytestmark = pytest.mark.django_db


def test_subscriber():
    """Serialize of a redditor-like object"""
    redditor_name = "fooo_username"
    redditor_user = UserFactory.create(username=redditor_name)
    assert SubscriberSerializer(redditor_user).data == {
        "subscriber_name": redditor_name
    }


def test_subscriber_validate_name_no_string():
    """validate the input in case the value is not a string"""
    with pytest.raises(ValidationError) as ex:
        SubscriberSerializer().validate_subscriber_name(None)
    assert ex.value.args[0] == "subscriber name must be a string"


def test_subscriber_validate_name_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    with pytest.raises(ValidationError) as ex:
        SubscriberSerializer().validate_subscriber_name("foo_user")
    assert ex.value.args[0] == "subscriber name is not a valid user"


def test_subscriber_validate_name():
    """validate the input"""
    user = UserFactory.create()
    assert SubscriberSerializer().validate_subscriber_name(user.username) == {
        "subscriber_name": user.username
    }


def test_subscriber_create():
    """Adds a subscriber"""
    user = UserFactory.create()
    ChannelFactory.create(name="foo_channel")
    subscriber_user = UserFactory.create()
    api_mock = Mock(
        add_subscriber=Mock(
            side_effect=[
                sync_channel_subscription_model("foo_channel", subscriber_user)
            ]
        )
    )
    subscriber = SubscriberSerializer(
        context={
            "channel_api": api_mock,
            "request": Mock(user=user),
            "view": Mock(kwargs={"channel_name": "foo_channel"}),
        }
    ).create({"subscriber_name": subscriber_user.username})
    assert subscriber.id == subscriber_user.id
    api_mock.add_subscriber.assert_called_once_with(
        subscriber_user.username, "foo_channel"
    )
