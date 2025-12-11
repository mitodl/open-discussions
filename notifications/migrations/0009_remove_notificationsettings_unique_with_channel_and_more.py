# Generated manually to remove channel field from NotificationSettings

from django.db import migrations


def remove_constraints_if_exist(apps, schema_editor):
    """Remove constraints only if they exist"""
    with schema_editor.connection.cursor() as cursor:
        # Check if constraints exist and remove them
        for constraint_name in ["unique_with_channel", "unique_without_channel"]:
            cursor.execute(
                """
                SELECT 1 FROM pg_constraint 
                WHERE conname = %s
                """,
                [constraint_name],
            )
            if cursor.fetchone():
                cursor.execute(
                    f"""
                    ALTER TABLE notifications_notificationsettings 
                    DROP CONSTRAINT {constraint_name}
                    """
                )


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0008_drop_channels_tables"),
    ]

    operations = [
        migrations.RunPython(remove_constraints_if_exist, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="notificationsettings",
            name="channel",
        ),
    ]
