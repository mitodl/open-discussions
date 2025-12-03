"""
Django settings for celery.
"""
from celery.schedules import crontab

from open_discussions.envs import get_bool, get_int, get_string

USE_CELERY = True
CELERY_BROKER_URL = get_string("CELERY_BROKER_URL", get_string("REDISCLOUD_URL", None))
CELERY_RESULT_BACKEND = get_string(
    "CELERY_RESULT_BACKEND", get_string("REDISCLOUD_URL", None)
)
CELERY_TASK_ALWAYS_EAGER = get_bool("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_TASK_EAGER_PROPAGATES = get_bool("CELERY_TASK_EAGER_PROPAGATES", True)
CELERY_WORKER_MAX_MEMORY_PER_CHILD = get_int(
    "CELERY_WORKER_MAX_MEMORY_PER_CHILD", 250_000
)

CELERY_BEAT_SCHEDULE = {
    "evict-expired-access-tokens-every-1-hrs": {
        "task": "channels.tasks.evict_expired_access_tokens",
        "schedule": crontab(minute=0, hour="*"),
    },
    "update-podcasts": {
        "task": "course_catalog.tasks.get_podcast_data",
        "schedule": get_int(
            "PODCAST_FETCH_SCHEDULE_SECONDS", 60 * 60 * 2
        ),  # default is every 2 hours
    },
    "update-managed-channel-memberships": {
        "task": "channels.tasks.update_memberships_for_managed_channels",
        "schedule": crontab(minute=30, hour=10),  # 6:30am EST
    },
}

CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "UTC"

CELEY_TASK_TRACK_STARTED = True
CELERY_TASK_SEND_SENT_EVENT = True
