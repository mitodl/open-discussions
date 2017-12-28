"""Tests for REST API views"""
# pylint: disable=unused-argument
import pytest

from django.core.urlresolvers import reverse
from praw.exceptions import APIException

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures("use_betamax", "praw_settings"),
]


def test_api_exception(client, logged_in_profile, mocker):
    """Make sure APIExceptions which aren't recognized become 500 errors"""
    exception = APIException('bizarre', 'A bizarre exception', 'bizarre_field')
    mocker.patch(
        'channels.serializers.CommentSerializer.update',
        side_effect=exception
    )
    url = reverse('comment-detail', kwargs={'comment_id': 'e8h'})
    with pytest.raises(APIException) as ex:
        client.patch(url, type='json', data={
            "text": "updated text",
        })
    assert ex.value == exception
