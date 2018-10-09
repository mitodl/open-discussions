"""Auth utils tests"""
from open_discussions.auth_utils import (
    get_encoded_and_signed_subscription_token,
    unsign_and_verify_username_from_token,
)


def test_get_encoded_and_signed_subscription_token(user):
    """Tests that get_encoded_and_signed_subscription_token returns a token"""
    assert get_encoded_and_signed_subscription_token(user) is not None


def test_unsign_and_verify_username_from_token(user):
    """Tests that unsign_and_verify_username_from_token returns the encoded username"""
    token = get_encoded_and_signed_subscription_token(user)
    assert unsign_and_verify_username_from_token(token) == user.username
