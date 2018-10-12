"""Embedly API tests"""
from embedly.api import get_embedly


def test_get_embedly(settings, mocker):
    """test get_embedly"""
    settings.EMBEDLY_KEY = "a great key :)"
    requests_patch = mocker.patch("requests.get", autospec=True)
    get_embedly("http://en.wikipedia.org/wiki/Giant_panda/")
    requests_patch.assert_called_once_with(
        settings.EMBEDLY_EMBED_URL,
        {"key": "a great key :)", "url": "http://en.wikipedia.org/wiki/Giant_panda/"},
    )
