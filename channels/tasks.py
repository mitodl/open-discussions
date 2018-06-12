"""Channels tasks"""
from channels import api
from open_discussions.celery import app


from celery.utils.log import get_task_logger
log = get_task_logger(__name__)


@app.task()
def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    api.evict_expired_access_tokens()


@app.task
def log_test():
    """Test logging error messages"""
    try:
        raise TabError
    except:
        log.exception("Testing celery logging")
