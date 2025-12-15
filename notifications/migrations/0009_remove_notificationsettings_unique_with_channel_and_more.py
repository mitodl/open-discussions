# Generated manually to remove channel field from NotificationSettings
# Note: The actual removal of the channel column and constraints was already
# handled by migration 0007 using raw SQL. This migration is kept as a no-op
# to maintain migration history consistency.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0008_drop_channels_tables"),
    ]

    operations = [
        # No-op: channel field and constraints were already removed in migration 0007
    ]
