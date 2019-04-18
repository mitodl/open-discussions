"""Tests for task helpers"""
import pytest

from channels import task_helpers
from open_discussions.features import HOT_POST_REPAIR


@pytest.mark.parametrize("delay", [200, 100])
def test_maybe_repair_post_in_host_listing(mocker, settings, delay):
    """Test that maybe_repair_post_in_host_listing triggers the task correctly"""
    post = mocker.Mock()
    self_post = post._self_post  # pylint: disable=protected-access
    patched_maybe_repair_post_in_host_listing = mocker.patch(
        "channels.tasks.maybe_repair_post_in_host_listing"
    )

    settings.OPEN_DISCUSSIONS_HOT_POST_REPAIR_DELAY = delay
    settings.FEATURES[HOT_POST_REPAIR] = True

    task_helpers.maybe_repair_post_in_host_listing(post)

    patched_maybe_repair_post_in_host_listing.apply_async.assert_called_once_with(
        args=[self_post.channel.name, self_post.post_id], countdown=delay
    )
