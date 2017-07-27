"""
Test end to end django views.
"""
import json
from unittest.mock import patch

from django.test import TestCase
from django.core.urlresolvers import reverse


class ViewsTest(TestCase):
    """
    Test that the views work as expected.
    """

    def test_webpack_url(self):
        """Verify that webpack bundle src shows up in production"""
        with self.settings(
            GA_TRACKING_ID='fake',
        ), patch('open_discussions.templatetags.render_bundle._get_bundle') as get_bundle:
            response = self.client.get(reverse('open_discussions-index'))

        bundles = [bundle[0][1] for bundle in get_bundle.call_args_list]
        assert set(bundles) == {
            'common',
            'root',
            'style',
        }
        js_settings = json.loads(response.context['js_settings_json'])
        assert js_settings == {
            'gaTrackingID': 'fake',
            'public_path': '/static/bundles/',
        }
