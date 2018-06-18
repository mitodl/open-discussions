"""
Functions related to tasks for channels
"""
from channels import tasks


def sync_channel_model(channel):
    """
    Create the channel in our database if it doesn't already exist

    Args:
        channel (Channel): The PRAW channel object
    """
    tasks.sync_channel_model.delay(channel.display_name)


def sync_post_model(post):
    """
    Create or update local post id information

    Args:
        post (Post): A PRAW post object
    """
    tasks.sync_post_model.delay(
        channel_name=post.channel.display_name,
        post_id=post.id,
    )


def sync_comment_model(comment):
    """
    Create or update local comment id information

    Args:
        comment (Comment): A PRAW comment object
    """
    tasks.sync_comment_model.delay(
        channel_name=comment.subreddit.display_name,
        post_id=comment.submission.id,
        comment_id=comment.id,
        parent_id=comment.parent().id,
    )
