"""Tests for validators"""
import pytest
from rest_framework.serializers import ValidationError

from channels.serializers.validators import validate_email, validate_username
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "email,fails",
    [(123, True), ("notexists@example.com", True), ("exists@example.com", False)],
)
def test_validate_email(email, fails):
    """Tests behavior of validate_email"""
    UserFactory.create(email="exists@example.com")
    if fails:
        with pytest.raises(ValidationError):
            validate_email(email)
    else:
        assert validate_email(email) == email


@pytest.mark.parametrize(
    "username,fails", [(123, True), ("notexists", True), ("exists", False)]
)
def test_validate_username(username, fails):
    """Tests behavior of validate_username"""
    UserFactory.create(username="exists")
    if fails:
        with pytest.raises(ValidationError):
            validate_username(username)
    else:
        assert validate_username(username) == username
