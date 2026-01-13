"""tests for the livestream views"""
import pytest
from django.urls import reverse
from rest_framework import status


def test_get_upcoming_events(client, user, mocker, settings):
    """Test that things work normally"""
    settings.LIVESTREAM_ACCOUNT_ID = 3_234_234
    settings.LIVESTREAM_SECRET_KEY = "secret ^_^"
    client.force_login(user)
    ls_api_mock = mocker.Mock()
    ls_api_mock.configure_mock(
        **{
            "json.return_value": {
                "total": 2,
                "data": [{"first": "event"}, {"second": "event"}],
            }
        }
    )
    get_stub = mocker.patch(
        "livestream.views.get_upcoming_events", return_value=ls_api_mock
    )
    resp = client.get(reverse("livestream"))
    get_stub.assert_called_once()
    assert resp.json() == {
        "total": 2,
        "data": [{"first": "event"}, {"second": "event"}],
    }
    assert resp.status_code == status.HTTP_200_OK


@pytest.mark.parametrize(
    "account_id,secret_key,should_get",
    [
        [13_241_234, "secret key", True],
        [None, "secret key", False],
        [13_241_234, None, False],
        [None, None, False],
    ],
)
def test_get_events_no_vars(
    client, user, mocker, settings, account_id, secret_key, should_get
):  # pylint: disable=too-many-arguments
    """We should get a 503 if the settings aren't present"""
    settings.LIVESTREAM_ACCOUNT_ID = account_id
    settings.LIVESTREAM_SECRET_KEY = secret_key
    client.force_login(user)
    ls_api_mock = mocker.Mock()
    ls_api_mock.configure_mock(**{"json.return_value": {"total": 2, "data": []}})

    get_stub = mocker.patch(
        "livestream.views.get_upcoming_events", return_value=ls_api_mock
    )
    resp = client.get(reverse("livestream"))
    if should_get:
        get_stub.assert_called_once()
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {"total": 2, "data": []}
    else:
        assert resp.json() == {}
        assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
