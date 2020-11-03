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
}
