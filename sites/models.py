"""Models for sites"""
from django.db import models

from open_discussions.models import TimestampedModel


class AuthenticatedSite(TimestampedModel):
    """Model for authenticated sites"""
    key = models.CharField(
        max_length=20,
        help_text='Key to lookup site in JWT token, must match exactly the key set by the authenticating site',
        unique=True,
    )
    title = models.CharField(
        max_length=50,
        help_text='Name of site to display in discussions',
    )

    base_url = models.URLField(
        verbose_name='External Base URL',
        help_text='Base url / home page for the site (e.g. http://my.site.domain/)',
    )
    login_url = models.URLField(
        verbose_name='External Login URL',
        help_text=('This url should require a user to login and then '
                   'redirect back to discussions (e.g. http://my.site.domain/discussions)'),
    )
    session_url = models.URLField(
        verbose_name='External Session URL',
        help_text=('The URL where discussions can request a new session '
                   '(e.g. http://my.site.domain/discussionsToken)'),
    )
    tos_url = models.URLField(
        verbose_name='External TOS URL',
        help_text=('There URL where discussions can link the user to view the site\'s TOS '
                   '(e.g. http://my.site.domain/terms-of-service)'),
    )

    def __str__(self):
        return self.title
