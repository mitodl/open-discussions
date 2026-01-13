"""Add context manager to make recording reddit requests simpler (deprecated)"""
from contextlib import contextmanager


@contextmanager
def record(name, user):  # pylint: disable=unused-argument
    """Record a cassette of some reddit communication (deprecated - no-op).

    Args:
        name (str): The name of the new cassette
        user (django.contrib.auth.models.User): User to authenticate with

    """
    yield None
