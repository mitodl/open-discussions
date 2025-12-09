"""Notification tasks"""
import celery
from django.conf import settings

from open_discussions.celery import app
from open_discussions.utils import chunks

from notifications import api


def _gen_attempt_send_notification_batches(notification_settings):
    """
    Generates the set of attempt_send_notification_batch tasks in a fan-out structure

    Args:
        notification_settings (iterable of NotificationSettings): an iterable of NotificationSettings to attempt the sends for

    Returns:
        celery.group: the celery group of tasks to execute
    """
    return celery.group(
        [
            attempt_send_notification_batch.si(notification_settings_ids)
            for notification_settings_ids in chunks(
                notification_settings,
                chunk_size=settings.NOTIFICATION_ATTEMPT_CHUNK_SIZE,
            )
        ]
    )


@app.task(bind=True)
def send_daily_frontpage_digests(self):
    """Daily frontpage digest task"""
    notification_settings = api.get_daily_frontpage_settings_ids()

    tasks = _gen_attempt_send_notification_batches(notification_settings)

    # to reduce the risk of triggering these multiple times, we trigger and replace this task all at once
    raise self.replace(tasks)


@app.task(bind=True)
def send_weekly_frontpage_digests(self):
    """Weekly frontpage digest task"""
    notification_settings = api.get_weekly_frontpage_settings_ids()

    tasks = _gen_attempt_send_notification_batches(notification_settings)

    # to reduce the risk of triggering these multiple times, we trigger and replace this task all at once
    raise self.replace(tasks)


@app.task(
    # The two settings below *should* ensure a task is never dropped, but it may be executed several times
    acks_late=True,  # don't acknowledge the task until it's done
    reject_on_worker_lost=True,  # if the worker gets killed, don't acknowledge the task
    rate_limit=settings.NOTIFICATION_ATTEMPT_RATE_LIMIT,  # an option to rate limit these if they become too much
)
def attempt_send_notification_batch(notification_settings_ids):
    """
    Attempt to send a notification batch

    Args:
        notification_settings_ids (list of int): list of NotificationSettings.ids
    """
    api.attempt_send_notification_batch(notification_settings_ids)


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
def send_frontpage_email_notification_batch(notification_ids):
    """
    Sends a batch of notifications. This is a separate task from send_email_notification_batch so that
    frontpage notification tasks, which are not time sensitive, can be queued separately from other tasks

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


@app.task
def notify_moderators(post_id, channel_name):
    """
    Notifies channel moderators of a new post.

    Args:
        post_id (str): base36 id of the post
        channel_name (str): channel name
    """
    channel = Channel.objects.get(name=channel_name)
    if channel.moderator_notifications:
        api.send_moderator_notifications(post_id, channel_name)
