"""Channel tasks helpers"""
from django.conf import settings

from open_discussions.features import HOT_POST_REPAIR, if_feature_enabled


@if_feature_enabled(HOT_POST_REPAIR)
def maybe_repair_post_in_host_listing(post_obj):
    """
    Runs a task to maybe repair a post if it's missing from the hot listing

    Args:
        post_obj (channels.proxies.PostProxy): A proxied post/submission
    """
    from channels import tasks

    post = post_obj._self_post  # pylint: disable=protected-access

    tasks.maybe_repair_post_in_host_listing.apply_async(
        args=[post.channel.name, post.post_id],
        countdown=settings.OPEN_DISCUSSIONS_HOT_POST_REPAIR_DELAY,
    )
