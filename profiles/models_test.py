""" Tests for profile model """
import pytest
from django.core.files.uploadedfile import UploadedFile

from open_discussions.factories import UserFactory
from open_discussions.test_utils import MockResponse
from profiles.models import Profile, IMAGE_SMALL_MAX_DIMENSION, IMAGE_MEDIUM_MAX_DIMENSION

pytestmark = pytest.mark.django_db


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


def test_save_with_gravatar_image(mocker):
    """
    An empty image should be replaced with a gravatar URL if found
    """
    new_user = UserFactory(email='testuser@example.com')
    new_user.profile.delete()
    base_img_url = 'https://www.gravatar.com/avatar/7ec7606c46a14a7ef514d1f1f9038823.jpg'
    mocker.patch('profiles.models.requests.get', return_value=MockResponse("", 200))
    profile = Profile(user=new_user, image=None, image_file=None)
    profile.save()
    assert profile.image == base_img_url
    assert profile.image_small == '{}?s={}'.format(base_img_url, IMAGE_SMALL_MAX_DIMENSION)
    assert profile.image_medium == '{}?s={}'.format(base_img_url, IMAGE_MEDIUM_MAX_DIMENSION)


def test_save_no_gravatar(mocker):
    """
    An empty image should not be replaced with a gravatar URL if the URL request returns a 404
    """
    new_user = UserFactory(email='testuser@example.com')
    new_user.profile.delete()
    mocker.patch('profiles.models.requests.get', return_value=MockResponse("", 404))
    profile = Profile(user=new_user, image=None, image_file=None)
    profile.save()
    assert profile.image is None
    assert profile.image_small is None
    assert profile.image_medium is None


def test_existing_image_not_replaced(mocker):
    """
    A non-empty image URL should not be replaced with a gravatar URL
    """
    new_user = UserFactory(email='testuser@example.com')
    new_user.profile.delete()
    original_url = 'https://example.cloudront.com/0.jpg'
    mocker.patch('profiles.models.requests.get', return_value=MockResponse("", 200))
    profile = Profile(user=new_user, image=original_url)
    profile.save()
    assert profile.image == original_url


def test_no_gravatar_for_updated_profile(mocker, user):
    """
    An empty image URL should not be replaced with a gravatar URL if the profile is not new.
    """
    mocker.patch('profiles.models.requests.get', return_value=MockResponse("", 200))
    profile = user.profile
    profile.image = None
    profile.save()
    assert profile.image is None
