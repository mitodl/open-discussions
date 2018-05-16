""" Tests for profile model """
import pytest


@pytest.mark.parametrize(['image', 'bio', 'headline', 'name'], [
    ['images/image_small.jpg', 'bio', 'headline', 'name'],
    ['images/image_small.jpg', 'bio', 'headline', None],
    ['images/image_small.jpg', 'bio', '', 'name'],
    ['images/image_small.jpg', None, 'headline', 'name'],
    ['', 'bio', 'headline', 'name'],
])
def test_profile_complete(image, bio, headline, name, user):
    """
    Tests that a profile is not complete if certain fields are blank/None
    """
    profile = user.profile
    profile.image_small = image
    profile.bio = bio
    profile.headline = headline
    profile.name = name
    profile.save()
    assert profile.is_complete is not (not image or not bio or not headline or not name)
