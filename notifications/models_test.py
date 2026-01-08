"""Tests for models"""
import pytest

from notifications.factories import NotificationSettingsFactory
from notifications.models import (
    FREQUENCIES,
    FREQUENCY_DAILY,
    FREQUENCY_IMMEDIATE,
    FREQUENCY_NEVER,
    FREQUENCY_WEEKLY,
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("trigger_frequency", FREQUENCIES)
def test_triggered_properties(trigger_frequency):
    """Test that the is_triggered_X properties return correct values"""
    ns = NotificationSettingsFactory.create(trigger_frequency=trigger_frequency)

    assert ns.is_triggered_immediate is (trigger_frequency == FREQUENCY_IMMEDIATE)
    assert ns.is_triggered_never is (trigger_frequency == FREQUENCY_NEVER)
    assert ns.is_triggered_weekly is (trigger_frequency == FREQUENCY_WEEKLY)
    assert ns.is_triggered_daily is (trigger_frequency == FREQUENCY_DAILY)
