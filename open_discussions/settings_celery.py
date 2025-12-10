"""
Django settings for celery.
"""
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
    "update-podcasts": {
        "task": "course_catalog.tasks.get_podcast_data",
        "schedule": get_int(
            "PODCAST_FETCH_SCHEDULE_SECONDS", 60 * 60 * 2
        ),  # default is every 2 hours
    },
}

CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "UTC"

CELEY_TASK_TRACK_STARTED = True
CELERY_TASK_SEND_SENT_EVENT = True
