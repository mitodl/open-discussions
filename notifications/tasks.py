"""Notification tasks"""
from open_discussions.celery import app

from notifications import api


@app.task
def send_daily_frontpage_digests():
    """Daily frontpage digest task"""
    api.send_daily_frontpage_digests()


@app.task
def send_weekly_frontpage_digests():
    """Weekly frontpage digest task"""
    api.send_weekly_frontpage_digests()


@app.task
def send_unsent_email_notifications():
    """Send any unsent notifications"""
    api.send_unsent_email_notifications()


@app.task
def send_email_notification_batch(notification_ids):
    """
    Sends a batch of notifications

    Args:
        notification_ids (list of int): notification ids to send
    """
    api.send_email_notification_batch(notification_ids)


@app.task
def notify_subscribed_users(post_id, comment_id, new_comment_id):
    """
    Notifies subscribed users of a new comment

    Args:
        post_id (str): base36 id of the post replied to
        comment_id (str): base36 id of the comment replied to (may be None)
        new_comment_id (str): base36 id of the new comment
    """
    api.send_comment_notifications(post_id, comment_id, new_comment_id)
