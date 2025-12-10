"""Tests for feature flags"""
import pytest

from open_discussions import features


@pytest.mark.parametrize(
    "value_in_settings,default,default_in_settings,expected",
    [
        (None, None, True, True),
        (None, None, False, False),
        (None, True, True, True),
        (None, True, False, True),
        (None, False, True, True),
        (None, False, False, False),
        (True, None, True, True),
        (True, None, False, True),
        (True, True, True, True),
        (True, True, False, True),
        (True, False, True, True),
        (True, False, False, True),
        (False, None, True, False),
        (False, None, False, False),
        (False, True, True, False),
        (False, True, False, False),
        (False, False, True, False),
        (False, False, False, False),
    ],
)
def test_is_enabled(
    settings, value_in_settings, default, default_in_settings, expected
):
    """Tests that is_enabled returns expected values"""
    key = "feature_key_we_will_never_use"
    settings.OPEN_DISCUSSIONS_FEATURES_DEFAULT = default_in_settings
    if value_in_settings is not None:
        settings.FEATURES[key] = value_in_settings

    assert features.is_enabled(key, default=default) is expected


# pylint: disable=too-many-arguments
@pytest.mark.parametrize(
    "feature_enabled,initial_value,update_value,expected_result_value",
    [(True, None, "new value", "new value"), (False, None, "new value", None)],
)
def test_if_feature_enabled(
    mocker,
    settings,
    feature_enabled,
    initial_value,
    update_value,
    expected_result_value,
):
    """Tests that if_feature_enabled turns a decorated function into a no-op if the
    given feature flag is disabled.
    """
    key = "feature_key"
    settings.FEATURES[key] = feature_enabled
    some_mock = mocker.Mock(value=initial_value)

    @features.if_feature_enabled(key)
    def mock_editing_func(value):  # pylint: disable=missing-docstring
        some_mock.value = value

    mock_editing_func(update_value)
    assert some_mock.value == expected_result_value
