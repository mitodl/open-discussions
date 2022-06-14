"""API for field_channels """
from django.contrib.auth.models import Group
from django.db import transaction

from field_channels.constants import FIELD_ROLE_CHOICES
from field_channels.models import FieldChannelGroupRole


def create_field_groups_and_roles(field_channel):
    """
    Create a channel's groups and roles

    Args:
        channel(channels.models.Channel): the channel to create groups for
    """
    roles = {}
    for role in FIELD_ROLE_CHOICES:
        group, _ = Group.objects.get_or_create(name=f"field_{field_channel.name}_{role}")
        roles[role] = FieldChannelGroupRole.objects.create(
            field=field_channel, group=group, role=role
        )

    return roles


@transaction.atomic
def get_role_model(field_channel, role):
    """
    Get or create a FieldChannelGroupRole object

    Args:
        field_channel(field_channels.models.FieldChannel): The field channel
        role(str): The role name (moderators)

    Returns:
        FieldChannelGroupRole: the ChannelGroupRole object
    """
    return FieldChannelGroupRole.objects.get(field=field_channel, role=role)


def add_user_role(field_channel, role, user):
    """
    Add a user to a field channel role's group

    Args:
        field_channel(field_channels.models.FieldChannel): The channel
        role(str): The role name (moderators)
        user(django.contrib.auth.models.User): The user
    """
    get_role_model(field_channel, role).group.user_set.add(user)


def remove_user_role(field_channel, role, user):
    """
    Remove a user from a field channel role's group

    Args:
        field_channel(field_channels.models.FieldChannel): The field channel
        role(str): The role name (moderators,)
        user(django.contrib.auth.models.User): The user
    """
    get_role_model(field_channel, role).group.user_set.remove(user)

