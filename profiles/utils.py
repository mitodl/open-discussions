"""Utils for profiles"""
import hashlib
import re
from contextlib import contextmanager
from io import BytesIO
from urllib.parse import quote, urljoin
from xml.sax.saxutils import escape as xml_escape

from django.conf import settings
from django.core.files.temp import NamedTemporaryFile
from PIL import Image

from open_discussions.utils import generate_filepath

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
    IMAGE_MEDIUM: IMAGE_MEDIUM_MAX_DIMENSION,
}

# This is the Django ImageField max path size
IMAGE_PATH_MAX_LENGTH = 100
GRAVATAR_IMAGE_URL = "https://www.gravatar.com/avatar/{}.jpg"

DEFAULT_FONTS = [
    "HelveticaNeue-Light",
    "Helvetica Neue Light",
    "Helvetica Neue",
    "Helvetica",
    "Arial",
    "Lucida Grande",
    "sans-serif",
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
SVG_TEMPLATE = re.sub(r"(\s+|\n)", " ", SVG_TEMPLATE)

DEFAULT_PROFILE_IMAGE = urljoin(settings.STATIC_URL, "images/avatar_default.png")


def generate_gravatar_image(user, image_field=None):
    """Query gravatar for an image and return those image properties

    Args:
        user (User): the user to compute gravatar image urls for
        image_field (str):

    Returns:
        str: The URL to the image.

    """
    gravatar_hash = hashlib.md5(user.email.lower().encode("utf-8")).hexdigest()
    gravatar_image_url = GRAVATAR_IMAGE_URL.format(gravatar_hash)
    max_dimension = IMAGE_FIELDS[image_field]
    size_param = f"&s={max_dimension}" if max_dimension else ""
    if user.profile.name:
        d_param = urljoin(
            settings.SITE_BASE_URL,
            f"/profile/{user.username}/{max_dimension}/fff/579cf9.png",
        )
    else:
        d_param = urljoin(settings.SITE_BASE_URL, DEFAULT_PROFILE_IMAGE)

    return f"{gravatar_image_url}?d={quote(d_param)}{size_param}"


def image_uri(profile, image_field=IMAGE_SMALL):
    """Return the correctly formatted profile image URI for a user"""
    if profile:
        image_file = getattr(profile, f"{image_field}_file")
        if not image_file.name:
            image_file = getattr(profile, image_field)
            if not image_file:
                return generate_gravatar_image(profile.user, image_field)
            return image_file
        return image_file.url
    return DEFAULT_PROFILE_IMAGE


# These functions are referenced in migrations so be careful refactoring
def profile_image_upload_uri(instance, filename):
    """upload_to handler for Profile.image
    """
    return generate_filepath(filename, instance.user.username, "", "profile")


def profile_image_upload_uri_small(instance, filename):
    """upload_to handler for Profile.image_small
    """
    return generate_filepath(filename, instance.user.username, "_small", "profile")


def profile_image_upload_uri_medium(instance, filename):
    """upload_to handler for Profile.image_medium
    """
    return generate_filepath(filename, instance.user.username, "_medium", "profile")


def avatar_uri(instance, filename):
    """upload_to handler for Channel.avatar
    """
    return generate_filepath(filename, instance.name, "_avatar", "channel")


def avatar_uri_medium(instance, filename):
    """upload_to handler for Channel.avatar_medium
    """
    return generate_filepath(filename, instance.name, "_avatar_medium", "channel")


def avatar_uri_small(instance, filename):
    """upload_to handler for Channel.avatar_small
    """
    return generate_filepath(filename, instance.name, "_avatar_small", "channel")


def banner_uri(instance, filename):
    """upload_to handler for Channel.banner
    """
    return generate_filepath(filename, instance.name, "_banner", "channel")


def article_image_uri(instance, filename):
    """upload_to handler for Article.cover_image
    """
    return generate_filepath(filename, instance.post.post_id, "_article", "article")


@contextmanager
def make_temp_image_file(*, width=500, height=500):
    """Create a temporary PNG image to test image uploads
    """
    with NamedTemporaryFile(suffix=".png") as image_file:
        image = Image.new("RGBA", size=(width, height), color=(256, 0, 0))
        image.save(image_file, "png")
        image_file.seek(0)
        yield image_file


def shrink_dimensions(width, height, max_dimension):
    """Resize dimensions so max dimension is max_dimension. If dimensions are too small no resizing is done
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
    """Make a thumbnail of the image

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
    pil_image.thumbnail(
        shrink_dimensions(pil_image.width, pil_image.height, max_dimension),
        Image.LANCZOS,
    )
    buffer = BytesIO()
    pil_image.convert("RGB").save(buffer, "JPEG", quality=90)
    buffer.seek(0)
    return buffer


def make_cropped_thumbnail(full_size_image, max_width, max_height):
    """Make a cropped thumbnail of the image

    Args:
        full_size_image (file):
            A file-like object containing an image. This file will seek back to the beginning after being read.
        max_width (int):
            The max width for the thumbnail
        max_height (int):
            The max height for the thumbnail
    Returns:
        BytesIO:
            A jpeg image which is a thumbnail of full_size_image

    """
    pil_image = Image.open(full_size_image)
    aspect_ratio = max_height / max_width
    if pil_image.height / pil_image.width < aspect_ratio:
        # crop width
        adjust = int((pil_image.width - (pil_image.height / aspect_ratio)) / 2)
        pil_image = pil_image.crop(
            box=(adjust, 0, pil_image.width - adjust, pil_image.height)
        )
    elif pil_image.height / pil_image.width > aspect_ratio:
        # crop height
        adjust = int((pil_image.height - (pil_image.width * aspect_ratio)) / 2)
        pil_image = pil_image.crop(
            box=(0, adjust, pil_image.width, pil_image.height - adjust)
        )
    pil_image.thumbnail(
        shrink_dimensions(pil_image.width, pil_image.height, max_width), Image.LANCZOS
    )
    buffer = BytesIO()
    pil_image.convert("RGB").save(buffer, "JPEG", quality=90)
    buffer.seek(0)
    return buffer


def update_full_name(user, name):
    """Update the first and last names of a user.

    Args:
        user(User): The user to modify.
        name(str): The full name of the user.

    """
    name_parts = name.split(" ")
    user.first_name = name_parts[0][:30]
    if len(name_parts) > 1:
        user.last_name = " ".join(name_parts[1:])[:30]
    user.save()


def dict_to_style(style_dict):
    """Transform a dict into a string formatted as an HTML style

    Args:
        style_dict(dict): A dictionary of style attributes/values

    Returns:
        str: An HTML style string

    """
    return "; ".join([f"{k}: {v}" for k, v in style_dict.items()])


def generate_initials(text):
    """Extract initials from a string

    Args:
        text(str): The string to extract initials from

    Returns:
        str: The initials extracted from the string

    """
    if not text:
        return None
    text = text.strip()
    if text:
        split_text = text.split(" ")
        if len(split_text) > 1:
            return (split_text[0][0] + split_text[-1][0]).upper()
        return split_text[0][0].upper()
    return None


def generate_svg_avatar(name, size, color, bgcolor):
    """Generate an SVG avatar based on input text.  Adopted from https://github.com/CraveFood/avinit

    Args:
        name(str): The text to extract two initials from.
        size(int): The width (and height) of the output SVG image
        color(str): The font color code (minus the # prefix).
        bgcolor(str): The image background color (minus the # prefix)

    Returns:
        str: an SVG image.

    """
    initials = generate_initials(name) or "A"

    style = {
        "fill": f"#{bgcolor}",
        "border-radius": f"{size - 1}px",
        "-moz-border-radius": f"{size - 1}px",
    }

    text_style = {
        "font-weight": "400px",
        "font-size": f"{int(size / 2)}px",
        "color": f"#{color}",
    }

    return SVG_TEMPLATE.format(
        **{
            "height": size,
            "size": size,
            "cx": int(size / 2),
            "cy": int(size / 2),
            "radius": int((size - 1) / 2),
            "style": dict_to_style(style),
            "color": color,
            "font-family": ",".join(DEFAULT_FONTS),
            "text-style": dict_to_style(text_style),
            "text": xml_escape(initials.upper()),
        }
    ).replace("\n", "")
