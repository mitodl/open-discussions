""" Tests for profile model """
import pytest
from django.core.files.uploadedfile import UploadedFile
from open_discussions import features


pytestmark = pytest.mark.django_db


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


@pytest.mark.parametrize('update_image', [True, False])
def test_image_update(user, profile_image, update_image):
    """
    Test that small and medium images are created only when update_image is True
    """
    profile = user.profile
    image_size = len(profile_image.getvalue())
    profile.image_file = UploadedFile(profile_image, "filename.png", "image/png", image_size)
    profile.image_small_file = None
    profile.image_medium_file = None
    profile.save(update_image=update_image)
    assert (profile.image_medium_file.name is not None) is update_image
    medium_size = len(profile.image_medium_file.read()) if update_image else 1
    assert medium_size != image_size
    assert (profile.image_small_file.name is not None) is update_image
    small_size = len(profile.image_small_file.read()) if update_image else 0
    assert small_size < medium_size


def test_null_image(user):
    """
    If the main image is null the thumbnails should be too
    """
    profile = user.profile
    assert profile.image_small_file is not None
    assert profile.image_medium_file is not None
    profile.image_file = None
    profile.save(update_image=True)
    assert not profile.image_file
    assert not profile.image_medium_file
    assert not profile.image_small_file
