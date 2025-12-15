"""tests for the embedly views"""
from django.urls import reverse
from rest_framework import status


def test_get_embedly(client, user, mocker, settings):
    """test the happy path"""
    settings.EMBEDLY_KEY = "a great key"
    client.force_login(user)
    external_url = "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
    external_thumb = "http://thumb.jpg"
    embedly_url = reverse("embedly-detail", kwargs={"url": external_url})
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(
        **{"json.return_value": {"some": "json", "thumbnail_url": external_thumb}}
    )
    get_stub = mocker.patch(
        "embedly.views.get_embedly_summary", return_value=embed_return_value
    )
    resp = client.get(embedly_url)
    get_stub.assert_called_once_with("https://en.wikipedia.org/wiki/Giant_panda/")
    assert resp.json() == {"some": "json", "thumbnail_url": external_thumb}
    assert resp.status_code == status.HTTP_200_OK


def test_get_embedly_no_thumbnail(client, user, mocker, settings):
    """test the happy path"""
    settings.EMBEDLY_KEY = "a great key"
    client.force_login(user)
    external_url = "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FWoolly_mammoth/"
    embedly_url = reverse("embedly-detail", kwargs={"url": external_url})
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{"json.return_value": {"some": "json"}})
    mocker.patch("embedly.views.get_embedly_summary", return_value=embed_return_value)
    client.get(embedly_url)


def test_get_embedly_no_key(client, user, settings):
    """test that we return a 503 if EMBEDLY_KEY is not set"""
    settings.EMBEDLY_KEY = None
    client.force_login(user)
    embedly_url = reverse(
        "embedly-detail",
        kwargs={
            "url": "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
        },
    )
    resp = client.get(embedly_url)
    assert resp.json() == {}
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


def test_get_embedly_anon(client, mocker, settings):
    """test that an anonymous user can get embedly"""
    settings.EMBEDLY_KEY = "a great key"
    embedly_url = reverse(
        "embedly-detail",
        kwargs={
            "url": "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
        },
    )
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{"json.return_value": {"some": "json"}})
    get_stub = mocker.patch(
        "embedly.views.get_embedly_summary", return_value=embed_return_value
    )
    resp = client.get(embedly_url)

    assert resp.json() == {"some": "json"}
    assert resp.status_code == status.HTTP_200_OK
    get_stub.assert_called_once_with("https://en.wikipedia.org/wiki/Giant_panda/")
