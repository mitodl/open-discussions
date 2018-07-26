""" Utils for profiles """
import hashlib
import re
from io import BytesIO
from os import path
from urllib.parse import urljoin, quote
from xml.sax.saxutils import escape as xml_escape

from contextlib import contextmanager
from django.conf import settings
from django.core.files.temp import NamedTemporaryFile

from PIL import Image

from open_discussions.utils import now_in_utc


# Max dimension of either height or width for small and medium images
IMAGE_SMALL_MAX_DIMENSION = 64
IMAGE_MEDIUM_MAX_DIMENSION = 128

IMAGE_STANDARD = "image"
IMAGE_SMALL = "image_small"
IMAGE_MEDIUM = "image_medium"

MAX_IMAGE_FIELD_LENGTH = 1024

IMAGE_FIELDS = {
    IMAGE_STANDARD: "",
    IMAGE_SMALL: IMAGE_SMALL_MAX_DIMENSION,
    IMAGE_MEDIUM: IMAGE_MEDIUM_MAX_DIMENSION
}

# This is the Django ImageField max path size
IMAGE_PATH_MAX_LENGTH = 100
IMAGE_PATH_PREFIX = 'profile'
GRAVATAR_IMAGE_URL = "https://www.gravatar.com/avatar/{}.jpg"

DEFAULT_FONTS = [
    'HelveticaNeue-Light',
    'Helvetica Neue Light',
    'Helvetica Neue',
    'Helvetica',
    'Arial',
    'Lucida Grande',
    'sans-serif',
]

SVG_TEMPLATE = """
<svg xmlns="http://www.w3.org/2000/svg" pointer-events="none"
     width="{size}" height="{size}">
  <circle cx="{cx}" cy="{cy}" r="{radius}" style="{style}"></circle>
  <text text-anchor="middle" y="50%" x="50%" dy="0.35em"
        pointer-events="auto" font-family="{font-family}"
        font-weight="400" fill="#{color}" style="{text-style}">{text}</text>
</svg>
""".strip()
SVG_TEMPLATE = re.sub(r'(\s+|\n)', ' ', SVG_TEMPLATE)

default_profile_image = urljoin(settings.STATIC_URL, "/images/avatar_default.png")


def get_gravatar_image(user, image_field=None):
    """
    Query gravatar for an image and return those image properties

    Args:
        user (User): the user to compute gravatar image urls for

    Returns:
        str: The URL to the image.
    """
    gravatar_hash = hashlib.md5(user.email.lower().encode('utf-8')).hexdigest()
    gravatar_image_url = GRAVATAR_IMAGE_URL.format(gravatar_hash)
    max_dimension = IMAGE_FIELDS[image_field]
    size_param = '&s={}'.format(max_dimension) if max_dimension else ''
    if user.profile.name:
        d_param = urljoin(
            settings.SITE_BASE_URL,
            '/profile/{}/{}/fff/579cf9.png'.format(
                user.username,
                max_dimension
            )
        )
    else:
        d_param = settings.SITE_BASE_URL + default_profile_image

    return '{}?d={}{}'.format(gravatar_image_url, quote(d_param), size_param)


def image_uri(user, image_field=IMAGE_SMALL):
    """ Return the correctly formatted profile image URI for a user """
    if user and hasattr(user, 'profile'):
        image_file = getattr(user.profile, '{}_file'.format(image_field))
        if not image_file.name:
            image_file = getattr(user.profile, image_field)
            if not image_file:
                return get_gravatar_image(user, image_field)
            return image_file
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


def update_full_name(user, name):
    """
    Update the first and last names of a user.

    Args:
        user(User): The user to modify.
        name(str): The full name of the user.
    """
    name_parts = name.split(' ')
    user.first_name = name_parts[0][:30]
    if len(name_parts) > 1:
        user.last_name = ' '.join(name_parts[1:])[:30]
    user.save()


def dict_to_style(style_dict):
    """
    Transform a dict into a string formatted as an HTML style

    Args:
        style_dict(dict): A dictionary of style attributes/values

    Returns:
        str: An HTML style string
    """

    return '; '.join(['{}: {}'.format(k, v) for k, v in style_dict.items()])


def get_svg_avatar(text, size, color, bgcolor):
    """
    Generate an SVG avatar based om input text.  Adopted from https://github.com/CraveFood/avinit

    Args:
        text(str): The text to extract two initials from.
        size(int): The width (and height) of the output SVG image
        color(str): The font color code (minus the # prefix).
        bgcolor(str): The image background color (minus the # prefix)

    Returns:
        str: an SVG image.
    """

    initials = '=)'

    text = text.strip()
    if text:
        split_text = text.split(' ')
        if len(split_text) > 1:
            initials = split_text[0][0] + split_text[-1][0]
        else:
            initials = split_text[0][0]

    style = {
        'fill': '#{}'.format(bgcolor),
        'border-radius': '{}px'.format(size - 1),
        '-moz-border-radius': '{}px'.format(size - 1)
    }

    text_style = {
        'font-weight': '400px',
        'font-size': '{}px'.format(int(size/2)),
        'color': '#{}'.format(color)
    }

    return SVG_TEMPLATE.format(**{
        'height': size,
        'size': size,
        'cx': int(size / 2),
        'cy': int(size / 2),
        'radius': int((size - 1) / 2),
        'style': dict_to_style(style),
        'color': color,
        'font-family': ','.join(DEFAULT_FONTS),
        'text-style': dict_to_style(text_style),
        'text': xml_escape(initials.upper()),
    }).replace('\n', '')
