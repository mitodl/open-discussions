"""Tests for channel API middleware"""
from django.utils.functional import SimpleLazyObject

from open_discussions.middleware.channel_api import ChannelApiMiddleware


def test_channel_api_middleware(mocker, jwt_token, rf, user):  # pylint: disable=unused-argument
    """Tests that the middleware makes a channel API object available on the request"""
    api_mock_obj = mocker.Mock(some_api_method=mocker.Mock(return_value='result'))
    patched_api_cls = mocker.patch('open_discussions.middleware.channel_api.Api', return_value=api_mock_obj)
    request = rf.get('/')
    request.user = user
    get_request_mock = mocker.Mock()
    middleware = ChannelApiMiddleware(get_request_mock)
    middleware(request)
    assert hasattr(request, 'channel_api')
    assert isinstance(request.channel_api, SimpleLazyObject)
    result = request.channel_api.some_api_method()
    patched_api_cls.assert_called_with(user)
    assert result == 'result'
