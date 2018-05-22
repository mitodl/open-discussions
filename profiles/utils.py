""" Utils for profiles """
from io import BytesIO
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


def image_uri(user, image_field='image_small'):
    """ Return the correctly formatted profile image URI for a user """
    if user and user.profile:
        image_file = getattr(user.profile, '{}_file'.format(image_field))
        if not image_file.name:
            return getattr(user.profile, image_field) or default_profile_image
        return image_file.url
    return default_profile_image


def generate_filepath(filename, username, suffix=''):
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
    path_format = "{prefix}/{username}/{name}-{timestamp}{suffix}{ext}"

    path_without_name = path_format.format(
        timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S"),
        prefix=IMAGE_PATH_PREFIX,
        username=username,
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
        username=username,
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

    def _upload_to(instance, filename):
        """Function passed to upload_to on an ImageField"""
        return generate_filepath(filename, instance.user.username, suffix)

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


def shrink_dimensions(width, height, max_dimension):
    """
    Resize dimensions so max dimension is max_dimension. If dimensions are too small no resizing is done
    Args:
        width (int): The width
        height (int): The height
        max_dimension (int): The maximum size of a dimension
    Returns:
        tuple of (small_width, small_height): A resized set of dimensions, as integers
    """
    max_width_height = max(width, height)
    if max_width_height < max_dimension:
        return width, height
    ratio = max_width_height / max_dimension

    return int(width / ratio), int(height / ratio)


def make_thumbnail(full_size_image, max_dimension):
    """
    Make a thumbnail of the image

    Args:
        full_size_image (file):
            A file-like object containing an image. This file will seek back to the beginning after being read.
        max_dimension (int):
            The max size of a dimension for the thumbnail
    Returns:
        BytesIO:
            A jpeg image which is a thumbnail of full_size_image
    """
    pil_image = Image.open(full_size_image)
    pil_image.thumbnail(shrink_dimensions(pil_image.width, pil_image.height, max_dimension), Image.ANTIALIAS)
    buffer = BytesIO()
    pil_image.convert('RGB').save(buffer, "JPEG", quality=90)
    buffer.seek(0)
    return buffer
