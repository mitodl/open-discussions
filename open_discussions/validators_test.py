"""Validators tests"""
import pytest
from rest_framework.serializers import ValidationError

from open_discussions.validators import is_true


@pytest.mark.parametrize("value,is_valid", [
    (True, True),
    (False, False),
    (None, False),
])
def test_is_true(value, is_valid):
    """Tests that is_true validates correctly"""
    if is_valid:
        # shouldn't raise a ValidationError
        is_true(value)
    else:
        with pytest.raises(ValidationError):
            is_true(value)
