"""
As described in
http://celery.readthedocs.org/en/latest/django/first-steps-with-django.html
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "open_discussions.settings")

from django.conf import settings  # noqa pylint: disable=wrong-import-position

app = Celery("open_discussions")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.conf.task_default_queue = "default"
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)  # pragma: no cover

app.conf.task_routes = {
    "channels.tasks.check_post_for_spam": {"queue": "spam"},
    "channels.tasks.check_comment_for_spam": {"queue": "spam"},
    "channels.tasks.update_spam": {"queue": "spam"},
    "channels.tasks.retire_user": {"queue": "spam"},
    "course_catalog.tasks.get_content_tasks": {"queue": "edx_content"},
    "course_catalog.tasks.get_content_files": {"queue": "edx_content"},
    "course_catalog.tasks.import_all_xpro_files": {"queue": "edx_content"},
    "course_catalog.tasks.import_all_mitx_files": {"queue": "edx_content"},
    "course_catalog.tasks.import_all_mitxonline_files": {"queue": "edx_content"},
    "search.tasks.index_course_content_files": {"queue": "edx_content"},
    "search.tasks.index_run_content_files": {"queue": "edx_content"},
    "search.tasks.delete_run_content_files": {"queue": "edx_content"},
    "notifications.tasks.send_frontpage_email_notification_batch": {
        "queue": "digest_emails"
    },
    "notifications.tasks.send_daily_frontpage_digests": {"queue": "digest_emails"},
    "notifications.tasks.send_weekly_frontpage_digests": {"queue": "digest_emails"},
    "notifications.tasks.attempt_send_notification_batch": {"queue": "digest_emails"},
}
