"""Channels tasks"""
import logging

from channels import api
from open_discussions.celery import app


log = logging.getLogger(__name__)


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
        log.exception(f"Testing celery logging {log.handlers}")
