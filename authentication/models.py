"""Models for mail app"""

from ipaddress import ip_address

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.safestring import mark_safe
from ipware.utils import is_private_ip

from open_discussions.models import TimestampedModel

HELP_TEXT = """
@spam.com: blocks all emails containing `@spam.com` like `joe@spam.com.edu`<br/>
@spam.com$: blocks all emails ending in `@spam.com` like `joe@spam.com`<br/>
spam.com: blocks all emails containing `spam.com` like `joe@antispam.com.edu`<br/>
sue@gmail.com: blocks `sue@gmail.com` and `bobbysue@gmail.com`<br/>
^sue@gmail.com: blocks `sue@gmail.com` but not `bobbysue@gmail.com`
"""


class BlockedEmailRegex(TimestampedModel):
    """An object indicating emails to block based on a matching regex string
    """

    match = models.CharField(
        max_length=256, null=False, blank=False, help_text=mark_safe(HELP_TEXT)
    )


class BlockedIPRange(TimestampedModel):
    """An object indicating ip ranges to block
    """

    ip_start = models.GenericIPAddressField(null=False, blank=False)
    ip_end = models.GenericIPAddressField(null=False, blank=False)

    def clean(self):
        for ip in (self.ip_start, self.ip_end):
            if ip is None:
                raise ValidationError("IP cannot be null", code="invalid")
            if is_private_ip(ip):
                raise ValidationError(f"IP {ip} is not routable", code="invalid")
        if ip_address(self.ip_start) > ip_address(self.ip_end):
            raise ValidationError(
                f"IP {self.ip_end} < IP {self.ip_start}", code="invalid"
            )


class EmailValidation(TimestampedModel):
    """Status of an email validation"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_validations",
    )
    email = models.CharField(max_length=512)
    list_name = models.CharField(max_length=100)
    result = models.CharField(max_length=30, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["list_name", "email"]),
        ]
