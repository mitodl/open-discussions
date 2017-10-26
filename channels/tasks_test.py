"""Tasks tests"""
import pytest

from channels import tasks

pytestmark = pytest.mark.django_db


def test_evict_expired_access_tokens():
    """Test that the task evicts expired tokens"""
    from channels.factories import RedditAccessTokenFactory
    from channels.models import RedditAccessToken
    future = RedditAccessTokenFactory.create()
    expired = RedditAccessTokenFactory.create(expired=True)

    tasks.evict_expired_access_tokens.delay()

    assert RedditAccessToken.objects.count() == 1
    assert RedditAccessToken.objects.filter(id=future.id).exists()
    assert not RedditAccessToken.objects.filter(id=expired.id).exists()
