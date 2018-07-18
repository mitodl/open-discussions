"""Channels tasks"""
from channels import api
from open_discussions.celery import app


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
def sync_post_model(*, channel_name, post_id, thumbnail):
    """
    Create or update local post id information

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post
    """
    api.sync_post_model(
        channel_name=channel_name,
        post_id=post_id,
        thumbnail=thumbnail
    )
