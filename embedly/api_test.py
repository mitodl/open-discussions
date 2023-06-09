"""Embedly API tests"""
from embedly.api import get_embedly_summary, get_embedly_content


def test_get_embedly_summary(settings, mocker):
    """test get_embedly_summary"""
    settings.EMBEDLY_KEY = "a great key :)"
    requests_patch = mocker.patch("requests.get", autospec=True)
    get_embedly_summary("http://en.wikipedia.org/wiki/Giant_panda/")
    requests_patch.assert_called_once_with(
        settings.EMBEDLY_EMBED_URL,
        {"key": "a great key :)", "url": "http://en.wikipedia.org/wiki/Giant_panda/"},
        timeout=settings.REQUESTS_TIMEOUT,
    )


def test_get_embedly_content(settings, mocker):
    """test get_embedly_content"""
    settings.EMBEDLY_KEY = "a great key :)"
    requests_patch = mocker.patch("requests.get", autospec=True)
    get_embedly_content("http://en.wikipedia.org/wiki/Giant_panda/")
    requests_patch.assert_called_once_with(
        settings.EMBEDLY_EXTRACT_URL,
        {"key": "a great key :)", "url": "http://en.wikipedia.org/wiki/Giant_panda/"},
        timeout=settings.REQUESTS_TIMEOUT,
    )
