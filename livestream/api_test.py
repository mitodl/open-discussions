"""livestream API tests"""
from livestream.api import get_upcoming_events


def test_get_upcoming_events(settings, mocker):
    """Test get upcoming events"""
    settings.LIVESTREAM_ACCOUNT_ID = 392_239
    settings.LIVESTREAM_SECRET_KEY = "secret key"
    requests_patch = mocker.patch("requests.get", autospec=True)
    resp = get_upcoming_events()
    requests_patch.assert_called_once_with(
        f"https://livestreamapis.com/v3/accounts/{settings.LIVESTREAM_ACCOUNT_ID}/upcoming_events",
        auth=(settings.LIVESTREAM_SECRET_KEY, ""),
        timeout=settings.REQUESTS_TIMEOUT,
    )
    assert resp == requests_patch.return_value
