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
