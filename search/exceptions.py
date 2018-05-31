"""Exceptions for search"""


class RetryException(Exception):
    """A special exception used to signal that celery can retry this task"""


class ReindexException(Exception):
    """An error during reindexing"""
