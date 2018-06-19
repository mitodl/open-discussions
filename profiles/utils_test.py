""" Tests for profiles.utils """
from io import BytesIO

import pytest
from PIL import Image

from open_discussions.factories import UserFactory
from profiles.utils import (
    profile_image_upload_uri,
    profile_image_upload_uri_small,
    profile_image_upload_uri_medium,
    _generate_upload_to_uri,
    image_uri,
    default_profile_image,
    update_full_name,
)


def test_upload_url(user):
    """
    profile_image_upload_uri should make an upload path with a timestamp
    """
    name = 'name'
    ext = '.jpg'
    filename = '{name}{ext}'.format(name=name, ext=ext)
    url = profile_image_upload_uri(user.profile, filename)
    assert url.startswith('profile/{username}/{name}-'.format(username=user.username, name=name))
    assert url.endswith('{ext}'.format(ext=ext))


def test_small(user):
    """
    profile_image_upload_uri_small should make an upload path with a timestamp
    """
    name = 'name'
    ext = '.jpg'
    filename = '{name}{ext}'.format(name=name, ext=ext)
    url = profile_image_upload_uri_small(user.profile, filename)
    assert url.startswith('profile/{username}/{name}-'.format(username=user.username, name=name))
    assert url.endswith('_small{ext}'.format(ext=ext))


def test_medium(user):
    """
    profile_image_upload_uri_medium should make an upload path with a timestamp
    """
    name = 'name'
    ext = '.jpg'
    filename = '{name}{ext}'.format(name=name, ext=ext)
    url = profile_image_upload_uri_medium(user.profile, filename)
    assert url.startswith('profile/{username}/{name}-'.format(username=user.username, name=name))
    assert url.endswith('_medium{ext}'.format(ext=ext))


def test_too_long_name(user):
    """
    A name which is too long should get truncated to 100 characters
    """
    filename = '{}.jpg'.format('a' * 150)
    full_path = profile_image_upload_uri(user.profile, filename)
    assert len(full_path) == 100
    assert full_path.startswith("profile/")
    assert full_path.endswith(".jpg")


def test_too_long_prefix(user):
    """
    A name which is too long should get truncated to 100 characters
    """
    filename = '{}.jpg'.format('a' * 150)
    with pytest.raises(ValueError) as ex:
        _generate_upload_to_uri("x" * 150)(user.profile, filename)  # pylint: disable=protected-access
    assert str(ex.value).startswith("path is longer than max length even without name")


@pytest.mark.django_db
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

    assert image_uri(profile.user, 'image_small') == (
        profile.image_small_file.url if image else url if url else default_profile_image
    )


@pytest.mark.django_db
@pytest.mark.parametrize('first_name, last_name', [
    ['Keihanaikukauakahihuliheekahaunaele', 'van der Graaf'],
    ['Jane', ''],
    ['Joe', 'FakeName10' * 16]
])
def test_update_full_name(first_name, last_name):
    """ Tests that user names are updated correctly """
    user = UserFactory.create()
    update_full_name(user, ' '.join([first_name, last_name]))
    assert user.first_name == first_name[:30]
    assert user.last_name == last_name[:30]
