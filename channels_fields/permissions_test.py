""" Tests for channels_fields.permissions"""
import pytest
from django.contrib.auth.models import AnonymousUser

from channels_fields import permissions
from channels_fields.api import add_user_role
from channels_fields.constants import FIELD_ROLE_MODERATORS
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_can_view_field_channels(mocker):
    """Anyone should be able to view a list of field channels"""
    assert (
        permissions.HasFieldPermission().has_permission(
            mocker.Mock(user=AnonymousUser(), method="GET"), mocker.Mock()
        )
        is True
    )


@pytest.mark.parametrize("is_staff", [True, False])
def test_can_create_field_channels(mocker, field_user, is_staff):
    """Only staff should be able to create field channels"""
    field_user.is_staff = is_staff
    assert (
        permissions.HasFieldPermission().has_permission(
            mocker.Mock(user=field_user, method="POST"), mocker.Mock()
        )
        is is_staff
    )


def test_can_view_field_channel_details(mocker, field_channel):
    """Anyone should be able to view details of a field channel"""
    assert (
        permissions.HasFieldPermission().has_object_permission(
            mocker.Mock(user=AnonymousUser(), method="GET"),
            mocker.Mock(),
            field_channel,
        )
        is True
    )


@pytest.mark.parametrize("is_moderator", [True, False])
def test_can_edit_field_channel_details(
    mocker, field_channel, field_user, is_moderator
):
    """Only moderators should be able to edit details of a field channel"""
    if is_moderator:
        add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    assert (
        permissions.HasFieldPermission().has_object_permission(
            mocker.Mock(user=field_user, method="PATCH"),
            mocker.Mock(kwargs={"field_name": field_channel.name}),
            field_channel,
        )
        is is_moderator
    )


@pytest.mark.parametrize("is_staff", [True, False])
def test_can_delete_field_channel(mocker, field_channel, field_user, is_staff):
    """Only staff should be able to delete a field channel"""
    if is_staff:
        field_user.is_staff = True
    assert (
        permissions.HasFieldPermission().has_object_permission(
            mocker.Mock(user=field_user, method="DELETE"),
            mocker.Mock(kwargs={"field_name": field_channel.name}),
            field_channel,
        )
        is is_staff
    )


@pytest.mark.parametrize("is_staff", [True, False])
@pytest.mark.parametrize("is_moderator", [True, False])
@pytest.mark.parametrize("method", ["GET", "POST"])
def test_can_view_create_moderators(  # pylint:disable=too-many-arguments
    mocker, field_channel, method, is_moderator, is_staff
):
    """Only moderators or staff should be able to view/create/delete moderators"""
    user = UserFactory.create()
    if is_moderator:
        add_user_role(field_channel, FIELD_ROLE_MODERATORS, user)
        user.refresh_from_db()
    user.is_staff = is_staff
    assert permissions.FieldModeratorPermissions().has_permission(
        mocker.Mock(user=user, method=method),
        mocker.Mock(kwargs={"field_name": field_channel.name}),
    ) is (is_moderator or is_staff)
    assert permissions.FieldModeratorPermissions().has_object_permission(
        mocker.Mock(user=user, method=method),
        mocker.Mock(kwargs={"field_name": field_channel.name}),
        field_channel,
    ) is (is_moderator or is_staff)
