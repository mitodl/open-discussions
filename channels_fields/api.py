"""API for channels_fields """
from typing import Dict

from django.contrib.auth.models import Group, User
from django.db import transaction

from channels_fields.constants import FIELD_ROLE_CHOICES, FIELD_ROLE_MODERATORS
from channels_fields.models import FieldChannel, FieldChannelGroupRole


def create_field_groups_and_roles(
    field_channel: FieldChannel,
) -> Dict[str, FieldChannelGroupRole]:
    """
    Create a field channel's groups and roles
    """
    roles = {}
    for role in FIELD_ROLE_CHOICES:
        group, _ = Group.objects.get_or_create(
            name=f"field_{field_channel.name}_{role}"
        )
        roles[role], _ = FieldChannelGroupRole.objects.get_or_create(
            field=field_channel, group=group, role=role
        )

    return roles


@transaction.atomic
def get_role_model(field_channel: FieldChannel, role: str) -> FieldChannelGroupRole:
    """
    Get or create a FieldChannelGroupRole object
    """
    return FieldChannelGroupRole.objects.get(field=field_channel, role=role)


def add_user_role(field_channel: FieldChannel, role: str, user: User):
    """
    Add a user to a field channel role's group
    """
    get_role_model(field_channel, role).group.user_set.add(user)


def remove_user_role(field_channel: FieldChannel, role: str, user: User):
    """
    Remove a user from a field channel role's group
    """
    get_role_model(field_channel, role).group.user_set.remove(user)


def get_group_role_name(field_name: str, role: str) -> str:
    """Get the group name for a FieldChannel and role"""
    return f"field_{field_name}_{role}"


def is_moderator(user: User, field_name: str) -> bool:
    """
    Determine if the user is a moderator for a field channel (or a staff user)
    """
    if not user or not field_name:
        return False
    group_names = set(user.groups.values_list("name", flat=True))
    return (
        user.is_staff
        or get_group_role_name(field_name, FIELD_ROLE_MODERATORS) in group_names
    )
