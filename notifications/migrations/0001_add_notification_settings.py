# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2018-02-14 21:05
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="NotificationSettings",
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
                    "notification_type",
                    models.CharField(
                        choices=[("frontpage", "Frontpage"), ("comments", "Comments")],
                        max_length=20,
                    ),
                ),
                ("via_app", models.BooleanField(default=False)),
                ("via_email", models.BooleanField(default=True)),
                (
                    "trigger_frequency",
                    models.CharField(
                        choices=[
                            ("never", "Never"),
                            ("immediate", "Immediate"),
                            ("daily", "Daily"),
                            ("weekly", "Weekly"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notification_settings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AlterUniqueTogether(
            name="notificationsettings",
            unique_together=set([("user", "notification_type")]),
        ),
    ]
