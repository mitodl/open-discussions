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
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)  # pragma: no cover

app.conf.broker_transport_options = {"queue_order_strategy": "priority"}
app.conf.task_default_priority = 5
