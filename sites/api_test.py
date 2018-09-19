"""API tests"""
from django.core.exceptions import ImproperlyConfigured
import pytest

from sites.api import get_default_site
from sites.factories import AuthenticatedSiteFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('site_key,throws', [
    ('key', False),
    ('abc', True),
    ('', True),
    (None, True),
])
def test_get_default_site(settings, site_key, throws):
    """Test that get_default_site works as expected"""
    authenticated_site = AuthenticatedSiteFactory.create(key='key')
    settings.OPEN_DISCUSSIONS_DEFAULT_SITE_KEY = site_key
    if not throws:
        assert get_default_site() == authenticated_site
    else:
        with pytest.raises(ImproperlyConfigured):
            get_default_site()
