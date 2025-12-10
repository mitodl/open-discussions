"""Tests for authentication.models"""
import pytest
from django.core.exceptions import ValidationError

from authentication.models import BlockedIPRange


@pytest.mark.django_db
@pytest.mark.parametrize(
    "ip_start, ip_end, error",
    [
        ["194.168.20.100", "194.168.3.100", "IP 194.168.3.100 < IP 194.168.20.100"],
        ["194.168.1.1", "194.168.3.100", None],
        [None, "182.0.0.1", "IP cannot be null"],
        ["194.168.20.100", None, "IP cannot be null"],
        ["192.168.2.2", "169.2.4.4", "IP 192.168.2.2 is not routable"],
        ["9.2.2.2", "10.2.4.4", "IP 10.2.4.4 is not routable"],
    ],
)
def test_blocked_ip_range_validation(ip_start, ip_end, error, settings):
    """Test that validation for BlockedIPRange works as expected"""
    settings.IPWARE_PRIVATE_IP_PREFIX = ("10.", "192.168.")
    ip_range = BlockedIPRange(ip_start=ip_start, ip_end=ip_end)
    if error:
        with pytest.raises(ValidationError) as exc:
            ip_range.clean()
        assert exc.value.message == error
    else:
        ip_range.clean()
