""" Tests for profiles.utils """
from io import BytesIO
from urllib.parse import urlparse, parse_qs
import xml.etree.ElementTree as etree

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
    get_svg_avatar)


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
@pytest.mark.parametrize('fullname', [None, 'Test User'])
def test_profile_img_url(url, image, fullname):
    """
    Test that the correct profile image URL is returned.
    """
    profile = UserFactory.create().profile
    profile.image_small = url
    profile.name = fullname
    if image:
        profile.image_small_file.save('/profiles/realimage.jpg', BytesIO(image.tobytes()), True)
    else:
        profile.image_small_file = None
    profile.save()

    profile_image = image_uri(profile.user, 'image_small')
    assert profile_image.startswith(
        profile.image_small_file.url if image else url if url else 'https://www.gravatar.com/avatar/'
    )
    if not image and not url:
        params_d = parse_qs(urlparse(profile_image).query)['d'][0]
        if fullname:
            assert params_d.endswith('profile/{}/64/fff/579cf9.png'.format(profile.user.username))
        else:
            assert params_d.endswith(default_profile_image)


@pytest.mark.django_db
def test_profile_img_url_anon():
    """
    Test that a user without a profile gets the default profile image
    """
    user = UserFactory.create()
    user.profile = None
    assert image_uri(user, 'image_small') == default_profile_image


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


def test_get_svg_avatar():
    """Test that an svg with correct attributes is created"""
    username = 'Test User'
    color = 'afafaf'
    bgcolor = 'dedede'
    size = 92
    svg = get_svg_avatar(username, size, color, bgcolor)
    root = etree.fromstring(svg)
    assert root.tag == '{http://www.w3.org/2000/svg}svg'
    circle = root.find('{http://www.w3.org/2000/svg}circle')
    assert circle.get('cx') == str(int(size / 2))
    assert '#{}'.format(bgcolor) in circle.get('style')
    text = root.find('{http://www.w3.org/2000/svg}text')
    assert text.get('fill') == '#{}'.format(color)
    assert text.text == 'TU'
