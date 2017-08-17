"""Configuration for pytest fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
import pytest

from open_discussions.factories import UserFactory


@pytest.fixture
def user(db):
    """Create a user"""
    return UserFactory.create()
