# Generated manually for discussion removal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0006_moderator_post_notifiacation_channel"),
    ]

    operations = [
        # Remove the foreign key constraint first
        migrations.RunSQL(
            sql='ALTER TABLE notifications_notificationsettings DROP CONSTRAINT IF EXISTS "notifications_notifi_channel_id_a9e02816_fk_channels_";',
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Remove the unique constraints
        migrations.RunSQL(
            sql='ALTER TABLE notifications_notificationsettings DROP CONSTRAINT IF EXISTS "unique_with_channel";',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql='DROP INDEX IF EXISTS "unique_without_channel";',
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Drop the channel_id column
        migrations.RunSQL(
            sql="ALTER TABLE notifications_notificationsettings DROP COLUMN IF EXISTS channel_id CASCADE;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Re-add the unique constraint without channel
        migrations.AddConstraint(
            model_name="notificationsettings",
            constraint=models.UniqueConstraint(
                fields=["user", "notification_type"],
                name="unique_user_notification_type",
            ),
        ),
        # Delete discussion-related models
        migrations.DeleteModel(
            name="CommentEvent",
        ),
        migrations.DeleteModel(
            name="PostEvent",
        ),
    ]
