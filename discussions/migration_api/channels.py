"""API for reddit migration"""
import logging
from functools import wraps

from django.db import transaction

from discussions.api import channels as api
from discussions.models import Channel

log = logging.getLogger()


def capture_exceptions(func):
    """A decorator to capture and log exceptions so they don't bubble up"""

    @wraps(func)
    def inner(*args, **kwargs):
        """Run the function and log any exceptions"""
        try:
            return func(*args, **kwargs)
        except:  # pylint: disable=bare-except
            log.exception(
                "Exception occurred in migration API, inconsistency may exist"
            )

    return inner


def _get_channel(source_channel):
    """
    Get a discussions.models.Channel from a channels.models.Channel

    Args:
        source_channel (channels.models.Channel):
            the source channel

    Returns:
        channels.models.Channel:
            the target channel
    """
    return Channel.objects.get(id=source_channel.id)


def _update_channel_fields(channel, source_channel):
    """
    Sync fields from a source channel to a target one

    Args:
        channel (discussions.models.Channel):
            the target channel
        source_channel (channels.models.Channel):
            the source channel
    """
    channel.membership_is_managed = source_channel.membership_is_managed
    channel.allowed_post_types = source_channel.allowed_post_types
    channel.channel_type = source_channel.channel_type

    channel.title = source_channel.title
    channel.avatar.name = source_channel.avatar.name
    channel.avatar_small.name = source_channel.avatar_small.name
    channel.avatar_medium.name = source_channel.avatar_medium.name
    channel.banner = source_channel.banner
    channel.about = source_channel.about

    channel.widget_list = source_channel.widget_list
    channel.ga_tracking_id = source_channel.ga_tracking_id


@capture_exceptions
@transaction.atomic
def create_channel(source_channel):
    """
    Creates  a discussions.Channel from a channels.Channel

    Args:
        source_channel (channels.models.Channel):
            the source channel

    Returns:
        discussions.models.Channel:
            the channel that was created
    """
    channel = Channel()
    channel.id = (
        source_channel.id
    )  # this is critical to ensure we keep references in sync
    channel.name = source_channel.name

    moderator_group, contributor_group = api.create_channel_groups(channel)
    channel.moderator_group = moderator_group
    channel.contributor_group = contributor_group

    _update_channel_fields(channel, source_channel)

    # since we set id, django will think this is an UPDATE, so require an INSERT
    channel.save(force_insert=True)
    api.set_channel_permissions(channel)


@capture_exceptions
def update_channel(source_channel):
    """
    Updates a discussions.Channel from a channels.Channel

    Args:
        source_channel (channels.models.Channel):
            the source channel

    Returns:
        discussions.models.Channel:
            the channel that was updated
    """
    channel = _get_channel(source_channel)
    _update_channel_fields(channel, source_channel)
    channel.save()
    api.set_channel_permissions(channel)


@capture_exceptions
def add_moderator(source_channel, user):
    """
    Add a moderator to a channel

    Args:
        source_channel (channels.models.Channel):
            the source channel
        user (User):
            the user to add as a moderator
    """
    channel = _get_channel(source_channel)
    user.groups.add(channel.moderator_group)


@capture_exceptions
def remove_moderator(source_channel, user):
    """
    Remove a moderator to a channel

    Args:
        source_channel (channels.models.Channel):
            the source channel
        user (User):
            the user to add as a moderator
    """
    channel = _get_channel(source_channel)
    user.groups.remove(channel.moderator_group)


@capture_exceptions
def add_contributor(source_channel, user):
    """
    Add a contributor to a channel

    Args:
        source_channel (channels.models.Channel):
            the source channel
        user (User):
            the user to add as a contributor
    """
    channel = _get_channel(source_channel)
    user.groups.remove(channel.contributor_group)


@capture_exceptions
def remove_contributor(source_channel, user):
    """
    Remove a contributor to a channel

    Args:
        source_channel (channels.models.Channel):
            the source channel
        user (User):
            the user to remove as a contributor
    """
    channel = _get_channel(source_channel)
    user.groups.remove(channel.contributor_group)
