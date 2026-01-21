# Generated manually - Remove channel field from model state only
# The actual database column was already removed in migration 0007

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0008_drop_channels_tables"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveConstraint(
                    model_name="notificationsettings",
                    name="unique_with_channel",
                ),
                migrations.RemoveConstraint(
                    model_name="notificationsettings",
                    name="unique_without_channel",
                ),
                migrations.RemoveField(
                    model_name="notificationsettings",
                    name="channel",
                ),
            ],
            database_operations=[
                # No database operations needed - already done in migration 0007
            ],
        ),
    ]
