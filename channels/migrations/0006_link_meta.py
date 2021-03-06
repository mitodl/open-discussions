# -*- coding: utf-8 -*-
# Generated by Django 1.11.10 on 2018-07-19 14:52
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [("channels", "0005_membership_default_true")]

    operations = [
        migrations.CreateModel(
            name="LinkMeta",
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
                ("url", models.URLField(max_length=2048, unique=True)),
                ("thumbnail", models.URLField(blank=True, max_length=2048, null=True)),
            ],
            options={"abstract": False},
        ),
        migrations.AddField(
            model_name="post",
            name="link_meta",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="channels.LinkMeta",
            ),
        ),
    ]
