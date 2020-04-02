"""Tests for permissions"""
import pytest

from discussions.constants import ChannelTypes
from discussions.factories import ChannelFactory
from discussions.permissions import ChannelIsReadableByAnyUser


@pytest.mark.parametrize(
    "channel_type, expected",
    [
        (ChannelTypes.PUBLIC, True),
        (ChannelTypes.RESTRICTED, True),
        (ChannelTypes.PRIVATE, False),
    ],
)
def test_channel_is_readable_by_any_user(channel_type, expected):
    """Verify the ChannelIsReadableByAnyUser permission works as expected"""
    channel = ChannelFactory.build(channel_type=channel_type.value)

    assert (
        ChannelIsReadableByAnyUser().has_object_permission(None, None, channel)
        is expected
    )
