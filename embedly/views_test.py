"""tests for the embedly views"""
from urllib.parse import unquote
import pytest

from django.core.urlresolvers import reverse
from rest_framework import status

from channels.models import LinkMeta
from open_discussions.features import ANONYMOUS_ACCESS


def test_get_embedly(client, user, mocker, settings):
    """test the happy path"""
    settings.EMBEDLY_KEY = 'a great key'
    client.force_login(user)
    external_url = "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
    external_thumb = 'http://thumb.jpg'
    embedly_url = reverse('embedly-detail', kwargs={
        "url": external_url
    })
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{
        'json.return_value': {'some': 'json', 'thumbnail_url': external_thumb}
    })
    get_stub = mocker.patch('embedly.views.get_embedly', return_value=embed_return_value)
    resp = client.get(embedly_url)
    get_stub.assert_called_once_with("https://en.wikipedia.org/wiki/Giant_panda/")
    assert resp.json() == {'some': 'json', 'thumbnail_url': external_thumb}
    assert resp.status_code == status.HTTP_200_OK
    linkmeta = LinkMeta.objects.filter(url=unquote(unquote(external_url))).first()
    assert linkmeta is not None
    assert linkmeta.thumbnail == external_thumb


def test_get_embedly_no_thumbnail(client, user, mocker, settings):
    """test the happy path"""
    settings.EMBEDLY_KEY = 'a great key'
    client.force_login(user)
    external_url = "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FWoolly_mammoth/"
    embedly_url = reverse('embedly-detail', kwargs={
        "url": external_url
    })
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{
        'json.return_value': {'some': 'json'}
    })
    mocker.patch('embedly.views.get_embedly', return_value=embed_return_value)
    client.get(embedly_url)
    assert LinkMeta.objects.filter(url=external_url).first() is None


def test_get_embedly_no_key(client, user, settings):
    """test that we return a 503 if EMBEDLY_KEY is not set"""
    settings.EMBEDLY_KEY = None
    client.force_login(user)
    embedly_url = reverse('embedly-detail', kwargs={
        "url": "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
    })
    resp = client.get(embedly_url)
    assert resp.json() == {}
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_get_embedly_anon(client, mocker, settings, allow_anonymous):
    """test that an anonymous user can get embedly"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    settings.EMBEDLY_KEY = 'a great key'
    embedly_url = reverse('embedly-detail', kwargs={
        "url": "https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
    })
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{
        'json.return_value': {'some': 'json'}
    })
    get_stub = mocker.patch('embedly.views.get_embedly', return_value=embed_return_value)
    resp = client.get(embedly_url)

    if allow_anonymous:
        assert resp.json() == {'some': 'json'}
        assert resp.status_code == status.HTTP_200_OK
        get_stub.assert_called_once_with("https://en.wikipedia.org/wiki/Giant_panda/")
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
