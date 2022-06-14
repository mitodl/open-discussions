"""Tests for channels_fields.api"""
import pytest

from channels_fields.api import add_user_role, remove_user_role
from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.models import FieldChannelGroupRole

pytestmark = pytest.mark.django_db


def test_add_moderator(field_channel, field_user):
    """Test add moderator"""
    add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    assert (
        FieldChannelGroupRole.objects.get(
            field__name=field_channel.name, role=FIELD_ROLE_MODERATORS
        ).group
        in field_user.groups.all()
    )


def test_remove_moderator(field_channel, field_user):
    """Test remove moderator"""
    remove_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    assert (
        FieldChannelGroupRole.objects.get(
            field__name=field_channel.name, role=FIELD_ROLE_MODERATORS
        ).group
        not in field_user.groups.all()
    )
