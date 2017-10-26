"""Channels tasks"""
from channels import api
from open_discussions.celery import app


@app.task()
def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    api.evict_expired_access_tokens()
