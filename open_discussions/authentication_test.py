"""Tests for authentication"""
from datetime import datetime, timedelta

from rest_framework_jwt.settings import api_settings

from open_discussions.auth_utils import get_encoded_and_signed_subscription_token
from open_discussions.authentication import (
    IgnoreExpiredJwtAuthentication,
    StatelessTokenAuthentication,
)

jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER


def test_stateless_token_authentication_expired(rf):
    """Tests that StatelessTokenAuthentication returns None if token is expired"""
    token = "MDFDNEZBV1dFOTc1VDFLRk4wQ0RZNllLUFo6MWVvRTlrOi05V2VacjYxWm9aR25wdTdVUlY2RGFQUXRRSQ=="
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"Token {token}"
    )
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_invalid(rf):
    """Tests that StatelessTokenAuthentication returns None if token is invalid"""
    token = "can i haz notifications?"
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"Token {token}"
    )
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_valid(rf, user):
    """Tests that StatelessTokenAuthentication returns a user if token is still valid"""
    token = get_encoded_and_signed_subscription_token(user)
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"Token {token}"
    )
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) == (user, None)


def test_stateless_token_authentication_wrong_prefix(rf, user):
    """Tests that StatelessTokenAuthentication nothing if the prefix is different"""
    token = get_encoded_and_signed_subscription_token(user)
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"OAuth {token}"
    )
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_no_header(rf):
    """Tests that StatelessTokenAuthentication returns nothing if no auth header is present"""
    request = rf.get("api/v0/notification_settings")
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_no_user(rf, user):
    """Tests that StatelessTokenAuthentication returns nothing if user doesn't exist"""
    token = get_encoded_and_signed_subscription_token(user)
    user.delete()
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"Token {token}"
    )
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_ignore_expired_jwt_authentication_valid(rf, user):
    """Tests that IgnoreExpiredJwtAuthentication returns None if token is valid"""
    payload = jwt_payload_handler(user)
    token = jwt_encode_handler(payload)
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"Bearer {token}"
    )
    authentication = IgnoreExpiredJwtAuthentication()
    assert authentication.authenticate(request) == (user, token)


def test_ignore_expired_jwt_authentication_expired(rf, user):
    """Tests that IgnoreExpiredJwtAuthentication returns None if token is expired"""
    payload = jwt_payload_handler(user)
    payload["exp"] = datetime.utcnow() - timedelta(seconds=100)
    token = jwt_encode_handler(payload)
    request = rf.get(
        "api/v0/notification_settings", HTTP_AUTHORIZATION=f"Bearer {token}"
    )
    authentication = IgnoreExpiredJwtAuthentication()
    assert authentication.authenticate(request) is None
