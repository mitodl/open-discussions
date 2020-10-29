"""Channel tasks helpers"""
from django.conf import settings

from channels.spam import extract_spam_check_headers, exempt_from_spamcheck
from open_discussions.features import HOT_POST_REPAIR, if_feature_enabled
from open_discussions.constants import CELERY_HIGH_PRIORITY


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


def check_post_for_spam(request, post_id):
    """
    Run a task to determine if the post is spam

    Args:
        request(): the request to create or update the post
        post_id(str): the base36 post id
    """
    from channels import tasks

    if exempt_from_spamcheck(request.user.email):
        return

    headers = extract_spam_check_headers(request)
    tasks.check_post_for_spam.apply_async(
        kwargs=dict(
            user_ip=headers.user_ip, user_agent=headers.user_agent, post_id=post_id
        ),
        countdown=15,
        priority=CELERY_HIGH_PRIORITY,
    )


def check_comment_for_spam(request, comment_id):
    """
    Run a task to determine if the post is spam

    Args:
        request(): the request to create or update the post
        comment_id(str): the base36 comment id
    """
    from channels import tasks

    if exempt_from_spamcheck(request.user.email):
        return

    headers = extract_spam_check_headers(request)
    tasks.check_comment_for_spam.apply_async(
        kwargs=dict(
            user_ip=headers.user_ip,
            user_agent=headers.user_agent,
            comment_id=comment_id,
        ),
        countdown=15,
        priority=CELERY_HIGH_PRIORITY,
    )
