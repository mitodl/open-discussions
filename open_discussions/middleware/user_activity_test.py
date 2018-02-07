"""Tests for user_activity middleware"""
from open_discussions.middleware.user_activity import UserActivityMiddleware


def test_user_activity_middleware(settings, mocker, jwt_token, rf, user):
    """Tests that the middleware updates the last_active_on field"""
    profile = user.profile
    assert profile.last_active_on is None
    rf.cookies.load({
        settings.OPEN_DISCUSSIONS_COOKIE_NAME: jwt_token,
    })

    request = rf.get('/')
    get_request_mock = mocker.Mock()
    middleware = UserActivityMiddleware(get_request_mock)

    response = middleware(request)

    assert get_request_mock.call_count == 1
    assert response == get_request_mock.return_value
    assert response.set_cookie.call_count == 1

    profile.refresh_from_db()
    assert profile.last_active_on is not None

    # load the cookie passed back
    rf.cookies.load({
        settings.OPEN_DISCUSSIONS_COOKIE_NAME: response.set_cookie.call_args[0][1],
    })
    request = rf.get('/')
    response = middleware(request)

    assert get_request_mock.call_count == 2
    assert response == get_request_mock.return_value
    assert response.set_cookie.call_count == 1  # should not be called subsequently


def test_user_activity_middleware_invalid_token(settings, mocker, rf, user):
    """Tests that the middleware updates the last_active_on field"""
    profile = user.profile
    assert profile.last_active_on is None
    rf.cookies.load({
        settings.OPEN_DISCUSSIONS_COOKIE_NAME: 'not.a.token',
    })

    request = rf.get('/')
    get_request_mock = mocker.Mock()
    middleware = UserActivityMiddleware(get_request_mock)

    response = middleware(request)

    assert get_request_mock.call_count == 1
    assert response == get_request_mock.return_value
    assert response.set_cookie.call_count == 0

    profile.refresh_from_db()
    assert profile.last_active_on is None
