"""Common fixtures and functions for channels_fields tests"""
import pytest

from channels_fields.factories import FieldChannelFactory
from open_discussions.factories import UserFactory


@pytest.fixture
def field_channel():
    """Generate a sample FieldChannel"""
    return FieldChannelFactory.create()


@pytest.fixture
def field_user():
    """Generate a sample user"""
    return UserFactory.create()
