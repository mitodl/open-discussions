""" Utils for profiles """
from os import path
from urllib.parse import urljoin

from contextlib import contextmanager
from django.conf import settings
from django.core.files.temp import NamedTemporaryFile

from PIL import Image

from open_discussions.utils import now_in_utc


# This is the Django ImageField max path size
IMAGE_PATH_MAX_LENGTH = 100

# Max dimension of either height or width for small and medium images
IMAGE_SMALL_MAX_DIMENSION = 64
IMAGE_MEDIUM_MAX_DIMENSION = 128

IMAGE_PATH_PREFIX = 'profile'

default_profile_image = urljoin(settings.STATIC_URL, "images/avatar_default.png")


def image_uri(profile, image_field='image_small'):
    """ Return the correctly formatted image URI """
    image_file = getattr(profile, '{}_file'.format(image_field))
    if not image_file.name:
        return getattr(profile, image_field) or default_profile_image
    return image_file.url


def generate_filepath(filename, suffix=''):
    """
    Generate and return the filepath for an uploaded image

    Args:
        filename(str): The name of the image file
        suffix(str): 'small', 'medium', or ''

    Returns:
        str: The filepath for the uploaded image.
    """
    name, ext = path.splitext(filename)
    timestamp = now_in_utc().replace(microsecond=0)
    path_format = "{prefix}/{name}-{timestamp}{suffix}{ext}"

    path_without_name = path_format.format(
        timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S"),
        prefix=IMAGE_PATH_PREFIX,
        suffix=suffix,
        ext=ext,
        name='',
    )
    if len(path_without_name) >= IMAGE_PATH_MAX_LENGTH:
        raise ValueError("path is longer than max length even without name: {}".format(path_without_name))

    max_name_length = IMAGE_PATH_MAX_LENGTH - len(path_without_name)
    full_path = path_format.format(
        name=name[:max_name_length],
        timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S"),
        prefix=IMAGE_PATH_PREFIX,
        suffix=suffix,
        ext=ext,
    )

    return full_path


def _generate_upload_to_uri(suffix=""):
    """
    Returns a function to specify the upload directory and filename, via upload_to on an ImageField

    Args:
        suffix (str):
            A suffix for the filename
    Returns:
        function:
            A function to use with upload_to to specify an upload directory and filename
    """

    def _upload_to(_, filename):
        """Function passed to upload_to on an ImageField"""
        return generate_filepath(filename, suffix)

    return _upload_to


# These three functions are referenced in migrations so be careful refactoring
def profile_image_upload_uri(instance, filename):
    """
    upload_to handler for Profile.image
    """
    return _generate_upload_to_uri()(instance, filename)


def profile_image_upload_uri_small(instance, filename):
    """
    upload_to handler for Profile.image_small
    """
    return _generate_upload_to_uri("_small")(instance, filename)


def profile_image_upload_uri_medium(instance, filename):
    """
    upload_to handler for Profile.image_medium
    """
    return _generate_upload_to_uri("_medium")(instance, filename)


@contextmanager
def make_temp_image_file(*, width=500, height=500):
    """
    Create a temporary PNG image to test image uploads
    """
    with NamedTemporaryFile(suffix=".png") as image_file:
        image = Image.new('RGBA', size=(width, height), color=(256, 0, 0))
        image.save(image_file, 'png')
        image_file.seek(0)
        yield image_file
