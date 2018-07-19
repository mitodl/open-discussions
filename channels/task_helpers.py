"""
Functions related to tasks for channels
"""


def sync_post_model(post):
    """
    Create or update local post id information

    Args:
        post (Post): A PRAW post object
    """
    from channels import tasks
    tasks.sync_post_model.delay(
        channel_name=post.subreddit.display_name,
        post_id=post.id,
        post_url=post.url
    )


def sync_comment_model(comment):
    """
    Create or update local comment id information

    Args:
        comment (Comment): A PRAW comment object
    """
    from channels import tasks
    tasks.sync_comment_model.delay(
        channel_name=comment.subreddit.display_name,
        post_id=comment.submission.id,
        comment_id=comment.id,
        parent_id=comment.parent().id,
    )
