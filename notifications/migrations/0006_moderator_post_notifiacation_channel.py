# Generated by Django 2.2.13 on 2021-01-05 02:48

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("channels", "0026_channel_moderator_notifications"),
        ("notifications", "0005_moderator_post_notifications"),
    ]

    operations = [
        migrations.AddField(
            model_name="notificationsettings",
            name="channel",
            field=models.ForeignKey(
                blank=True,
                default=None,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="channels.Channel",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="notificationsettings", unique_together=set()
        ),
        migrations.AddConstraint(
            model_name="notificationsettings",
            constraint=models.UniqueConstraint(
                fields=("user", "notification_type", "channel"),
                name="unique_with_channel",
            ),
        ),
        migrations.AddConstraint(
            model_name="notificationsettings",
            constraint=models.UniqueConstraint(
                condition=models.Q(channel=None),
                fields=("user", "notification_type"),
                name="unique_without_channel",
            ),
        ),
    ]
