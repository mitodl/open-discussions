""" Tests for profiles.utils """
from io import BytesIO

import pytest
from PIL import Image

from open_discussions.factories import UserFactory
from profiles.utils import profile_image_upload_uri, profile_image_upload_uri_small, _generate_upload_to_uri, \
    profile_image_upload_uri_medium, image_uri, default_profile_image


def test_upload_url():
    """
    profile_image_upload_uri should make an upload path with a timestamp
    """
    name = 'name'
    ext = '.jpg'
    filename = '{name}{ext}'.format(name=name, ext=ext)
    url = profile_image_upload_uri(None, filename)
    assert url.startswith('profile/{name}-'.format(name=name))
    assert url.endswith('{ext}'.format(ext=ext))


def test_small():
    """
    profile_image_upload_uri_small should make an upload path with a timestamp
    """
    name = 'name'
    ext = '.jpg'
    filename = '{name}{ext}'.format(name=name, ext=ext)
    url = profile_image_upload_uri_small(None, filename)
    assert url.startswith('profile/{name}-'.format(name=name))
    assert url.endswith('_small{ext}'.format(ext=ext))


def test_medium():
    """
    profile_image_upload_uri_medium should make an upload path with a timestamp
    """
    name = 'name'
    ext = '.jpg'
    filename = '{name}{ext}'.format(name=name, ext=ext)
    url = profile_image_upload_uri_medium(None, filename)
    assert url.startswith('profile/{name}-'.format(name=name))
    assert url.endswith('_medium{ext}'.format(ext=ext))


def test_too_long_name():
    """
    A name which is too long should get truncated to 100 characters
    """
    filename = '{}.jpg'.format('a' * 150)
    full_path = profile_image_upload_uri(None, filename)
    assert len(full_path) == 100
    assert full_path.startswith("profile/")
    assert full_path.endswith(".jpg")


def test_too_long_prefix():
    """
    A name which is too long should get truncated to 100 characters
    """
    filename = '{}.jpg'.format('a' * 150)
    with pytest.raises(ValueError) as ex:
        _generate_upload_to_uri("x" * 150)(None, filename)  # pylint: disable=protected-access
    assert str(ex.value).startswith("path is longer than max length even without name")


@pytest.mark.django_db()
@pytest.mark.parametrize('url', [None, 'http://testserver/profiles/image.jpg'])
@pytest.mark.parametrize('image', [None, Image.new('RGBA', size=(50, 50), color=(155, 0, 0))])
def test_profile_img_url(url, image):
    """
    Test that the correct profile image URL is returned.
    """
    profile = UserFactory.create().profile
    profile.image_small = url
    if image:
        profile.image_small_file.save('/profiles/realimage.jpg', BytesIO(image.tobytes()), True)
    else:
        profile.image_small_file = None
    profile.save()

    assert image_uri(profile, 'image_small') == (
        profile.image_small_file.url if image else url if url else default_profile_image
    )
