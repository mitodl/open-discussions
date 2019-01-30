"""API for backpopulating the db from reddit"""
from datetime import datetime, timezone
import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from channels import api, utils
from channels.constants import (
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
    EXTENDED_POST_TYPE_ARTICLE,
    DELETED_COMMENT_OR_POST_TEXT,
)

User = get_user_model()
log = logging.getLogger()


def backpopulate_post(*, post, submission):
    """
    Backpopulates a post with values from a submission

    Args:
        post (channels.models.Post): the post to backpopulate
        submission (Submission): the reddit submission to source data from
    """

    if not submission.is_self:
        post.post_type = LINK_TYPE_LINK
        post.url = submission.url
        if post.link_meta is None and settings.EMBEDLY_KEY:
            post.link_meta = utils.get_or_create_link_meta(submission.url)
    elif getattr(post, "article", None):
        post.post_type = EXTENDED_POST_TYPE_ARTICLE
    else:
        post.post_type = LINK_TYPE_SELF
        post.text = submission.selftext

    try:
        if submission.author:
            post.author = User.objects.get(username=submission.author.name)
    except User.DoesNotExist:
        log.warning(
            "Unable to find author '%s'' for submission '%s'",
            submission.author.name,
            submission.id,
        )

    post.title = submission.title
    post.score = submission.ups
    post.num_comments = submission.num_comments
    post.edited = submission.edited if submission.edited is False else True
    post.removed = submission.banned_by is not None
    # this already has a values, but it's incorrect for records prior to the creation of the Post model
    post.created_on = datetime.fromtimestamp(submission.created, tz=timezone.utc)
    post.deleted = submission.selftext == DELETED_COMMENT_OR_POST_TEXT
    post.save()


def backpopulate_comments(*, post, submission):
    """
    Backpopulates a post's comments with values from a submission CommentTree

    Args:
        post (channels.models.Post): the post to backpopulate
        submission (Submission): the reddit submission to source data from

    Returns:
        int: number of comments backpopulated
    """
    submission.comments.replace_more(limit=None)
    author_usernames = {
        comment.author.name for comment in submission.comments if comment.author
    }
    authors_by_username = User.objects.in_bulk(author_usernames, field_name="username")
    update_count = 0

    for comment in submission.comments:
        author = (
            authors_by_username.get(comment.author.name) if comment.author else None
        )

        api.create_comment(post=post, comment=comment, author=author)
        update_count += 1

    return update_count
