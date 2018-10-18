"""Channels tasks"""
from django.conf import settings
from django.contrib.auth import get_user_model

from channels import api
from open_discussions.celery import app
from open_discussions.utils import chunks

User = get_user_model()


@app.task()
def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    api.evict_expired_access_tokens()


@app.task
def sync_comment_model(*, channel_name, post_id, comment_id, parent_id):
    """
    Create or update local comment id information

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post
        comment_id (str): The id of the comment
        parent_id (str): The id of the reply comment. If None the parent is the post
    """
    api.sync_comment_model(
        channel_name=channel_name,
        post_id=post_id,
        comment_id=comment_id,
        parent_id=parent_id,
    )


@app.task
def sync_post_model(*, channel_name, post_id, post_url):
    """
    Create or update local post id information

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post
        post_url(str): The external url of a link post
    """
    api.sync_post_model(channel_name=channel_name, post_id=post_id, post_url=post_url)


@app.task
def subscribe_all_users_to_default_channel(*, channel_name):
    """
    Subscribes all users to a new default channel

    Args:
        channel_name (str): The name of the channel
    """
    chunk_size = settings.OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE
    query = (
        User.objects.exclude(username=settings.INDEXING_API_USERNAME)
        .values_list("username", flat=True)
        .iterator()
    )

    for usernames in chunks(query, chunk_size=chunk_size):
        subscribe_user_range_to_default_channel.delay(
            channel_name=channel_name, usernames=usernames
        )


@app.task
def subscribe_user_range_to_default_channel(*, channel_name, usernames):
    """
    Subscribes all users to a new default channel

    Args:
        channel_name (str): The name of the channel
        usernames (list of str): list of user usernames
    """
    api_user = User.objects.get(username=settings.INDEXING_API_USERNAME)
    admin_api = api.Api(api_user)
    # walk the usernames and add them as subscribers
    for username in usernames:
        admin_api.add_subscriber(username, channel_name)
