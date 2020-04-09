"""Tests for channels APIs"""
import pytest
from guardian.shortcuts import assign_perm, get_perms

from discussions.api.channels import (
    create_channel_groups,
    set_channel_permissions,
    set_user_or_group_permissions,
)
from discussions.factories import ChannelFactory
from open_discussions.factories import GroupFactory, UserFactory

pytestmark = pytest.mark.django_db


def test_create_channel_groups():
    """Test create_channel_groups creates moderator and contributor groups"""

    moderator_group, contributor_group = create_channel_groups("channel name")

    assert moderator_group.name == "Moderators: channel name"
    assert contributor_group.name == "Contributors: channel name"


def test_set_user_or_group_permissions():
    """Test set_user_or_group_permissions adds/removes permissions"""
    channel = ChannelFactory.create()
    user = UserFactory.create()
    group = GroupFactory.create()

    initial_perms = sorted(["delete_channel", "view_channel"])
    updated_perms = sorted(["view_channel", "change_channel"])

    for entity in [user, group]:
        for perm in initial_perms:
            assign_perm(perm, entity, channel)

        assert sorted(get_perms(entity, channel)) == initial_perms

        set_user_or_group_permissions(channel, entity, updated_perms)

        assert sorted(get_perms(entity, channel)) == updated_perms


def test_set_channel_permissions():
    """Test set_channel_permissions sets the correct permissions"""
    channel = ChannelFactory.create()

    set_channel_permissions(channel)

    assert sorted(get_perms(channel.contributor_group, channel)) == ["view_channel"]
    assert sorted(get_perms(channel.moderator_group, channel)) == [
        "change_channel",
        "view_channel",
    ]
