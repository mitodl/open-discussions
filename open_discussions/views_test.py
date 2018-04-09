"""
Test end to end django views.
"""
import json

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


def test_webpack_url(settings, staff_client, mocker, authenticated_site):
    """Verify that webpack bundle src shows up in production"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')

    response = staff_client.get(reverse('open_discussions-index'))

    bundles = [bundle[0][1] for bundle in get_bundle_mock.call_args_list]
    assert set(bundles) == {
        'common',
        'root',
        'style',
    }
    js_settings = json.loads(response.context['js_settings_json'])
    assert js_settings == {
        'gaTrackingID': 'fake',
        'public_path': '/static/bundles/',
        'max_comment_depth': 6,
        'username': None,
        'profile_image_small': None,
        'user_full_name': None,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        }
    }
