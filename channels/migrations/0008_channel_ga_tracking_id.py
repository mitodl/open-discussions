# -*- coding: utf-8 -*-
# Generated by Django 1.11.10 on 2018-08-01 19:19
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('channels', '0007_avatar_banner'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='ga_tracking_id',
            field=models.CharField(blank=True, max_length=24, null=True),
        ),
    ]
