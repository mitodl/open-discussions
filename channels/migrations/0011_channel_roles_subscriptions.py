# Generated by Django 2.1.2 on 2018-11-07 13:02

from django.conf import settings
from django.contrib.auth.models import Group
from django.db import migrations, models
import django.db.models.deletion

from channels.constants import GROUP_MODERATORS, GROUP_CONTRIBUTORS


class Migration(migrations.Migration):

    dependencies = [
        ("auth", "0009_alter_user_last_name_max_length"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("channels", "0010_avatar_small_medium"),
    ]

    def add_groups(apps, schema_editor):
        Group.objects.update_or_create(name=GROUP_MODERATORS)
        Group.objects.update_or_create(name=GROUP_CONTRIBUTORS)

    def reverse(apps, schema_editor):
        pass

    operations = [
        migrations.CreateModel(
            name="ChannelRole",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_on", models.DateTimeField(auto_now_add=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                (
                    "channel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="channels.Channel",
                    ),
                ),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="auth.Group"
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ChannelSubscription",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_on", models.DateTimeField(auto_now_add=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                (
                    "channel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="channels.Channel",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AlterUniqueTogether(
            name="channelsubscription", unique_together={("user", "channel")}
        ),
        migrations.AlterIndexTogether(
            name="channelsubscription", index_together={("user", "channel")}
        ),
        migrations.AlterUniqueTogether(
            name="channelrole", unique_together={("user", "channel", "group")}
        ),
        migrations.AlterIndexTogether(
            name="channelrole", index_together={("user", "channel")}
        ),
        migrations.RunPython(add_groups, reverse),
    ]
