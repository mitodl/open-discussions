""" Models for mail app """
from django.db import models
from django.utils.safestring import mark_safe

from open_discussions.models import TimestampedModel


HELP_TEXT = """
@spam.com: blocks all emails containing `@spam.com` like `joe@spam.com.edu`<br/>
@spam.com$: blocks all emails ending in `@spam.com` like `joe@spam.com`<br/>
spam.com: blocks all emails containing `spam.com` like `joe@antispam.com.edu`<br/>
sue@gmail.com: blocks `sue@gmail.com` and `bobbysue@gmail.com`<br/>
^sue@gmail.com: blocks `sue@gmail.com` but not `bobbysue@gmail.com`
"""


class BlockedEmailRegex(TimestampedModel):
    """
    An object indicating emails to block based on a matching regex string
    """

    match = models.CharField(
        max_length=256, null=False, blank=False, help_text=mark_safe(HELP_TEXT)
    )
