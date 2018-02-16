"""Tests for feature flags"""
import pytest

from open_discussions import features


@pytest.mark.parametrize('value_in_settings,default,expected', [
    (None, True, True),
    (None, False, False),
    (True, True, True),
    (True, False, True),
    (False, True, False),
    (False, False, False),
])
def test_is_enabled(settings, value_in_settings, default, expected):
    """Tests that is_enabled returns expected values"""
    key = 'feature_key_we_will_never_use'
    if value_in_settings is not None:
        settings.FEATURES[key] = value_in_settings

    assert features.is_enabled(key, default=default) is expected
