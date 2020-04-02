"""Imagekit backends"""
from imagekit.cachefiles.backends import Simple


class SafeCacheBackend(Simple):
    """
    Version of ImageKit Simple backend that does not try to
    check for existence of the source image

    See this patch on the debian package:
    https://salsa.debian.org/python-team/modules/python-django-imagekit/-/commit/0e8cbae04bd71d49bce8a697a00a864d89992ed0#dc5ac18cee8fe41a6bb7c9b154164e06dfa90fbe
    """

    def _exists(self, file):
        """Return True if file exists"""
        return bool(
            getattr(file, "_file", None) or file.name and file.storage.exists(file.name)
        )
