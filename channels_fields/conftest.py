"""Common fixtures and functions for channels_fields tests"""
import pytest

from channels_fields.factories import FieldChannelFactory


@pytest.fixture
def field_channel():
    """Generate a sample FieldChannel"""
    return FieldChannelFactory.create()
