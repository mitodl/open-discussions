"""API for channels"""
from django.contrib.auth.models import Group
from django.db import transaction
from guardian.core import ObjectPermissionChecker
from guardian.shortcuts import assign_perm, remove_perm


def create_channel_groups(channel_name):
    """
    Create the moderator and contributor groups for a channel

    Args:
        channel_name (str):
            the name of the channel

    Returns:
        tuple of (Group, Group): the created channel groups
    """
    moderator_group, _ = Group.objects.get_or_create(name=f"Moderators: {channel_name}")
    contributor_group, _ = Group.objects.get_or_create(
        name=f"Contributors: {channel_name}"
    )

    return moderator_group, contributor_group


@transaction.atomic
def set_user_or_group_permissions(channel, user_or_group, perms):
    """
    Sets the permissions for a user or group on a channel

    Args:
        channel(discussions.models.Channel):
            the channel for which to set permissions
        user_or_group (User or Group):
            the user or group to add permissions for
        perms (list of str):
            the list of permissions
    """
    checker = ObjectPermissionChecker(user_or_group)

    # make a copy of the current permissions list to prepopulate which perms we need to remove
    perms_to_remove = checker.get_perms(channel)[:]

    for perm in perms:
        if not checker.has_perm(perm, channel):
            assign_perm(perm, user_or_group, channel)

        if perm in perms_to_remove:
            perms_to_remove.remove(perm)

    for perm in perms_to_remove:
        remove_perm(perm, user_or_group, channel)


@transaction.atomic
def set_channel_permissions(channel):
    """
    Sets permissions for the users and groups of the channel

    Args:
        channel(discussions.models.Channel):
            the channel for which to set permissions
    """
    # moderator permissions
    set_user_or_group_permissions(
        channel, channel.moderator_group, ["change_channel", "view_channel"]
    )

    # contributor permissions
    set_user_or_group_permissions(channel, channel.contributor_group, ["view_channel"])
