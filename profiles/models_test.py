""" Tests for profile model """
import pytest

from open_discussions import features


@pytest.mark.parametrize(['image_field', 'image_url', 'bio', 'headline', 'name'], [
    [True, 'images/image_small.jpg', 'bio', 'headline', 'name'],
    [False, 'images/image_small.jpg', 'bio', 'headline', None],
    [True, 'images/image_small.jpg', 'bio', '', 'name'],
    [False, 'images/image_small.jpg', None, 'headline', 'name'],
    [False, None, 'bio', 'headline', 'name'],
])  # pylint:disable=too-many-arguments
def test_profile_complete(image_field, image_url, bio, headline, name, user, settings):
    """
    Tests that a profile is not complete if certain fields are blank/None
    """
    settings.FEATURES[features.PROFILE_UI] = True
    profile = user.profile
    if not image_field:
        profile.image_small_file = None
    profile.image_small = image_url
    profile.bio = bio
    profile.headline = headline
    profile.name = name
    profile.save()
    is_default_image = not image_field and not image_url
    assert profile.is_complete is not (is_default_image or not bio or not headline or not name)


@pytest.mark.parametrize('feature_enabled', [True, False])
def test_profile_complete_feature_enabled(feature_enabled, user, settings):
    """ Tests that profile.is_complete returns True if the PROFILE_UI feature is disabled """
    settings.FEATURES[features.PROFILE_UI] = feature_enabled
    assert user.profile.is_complete is not feature_enabled
