# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2018-03-05 19:26
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0003_add_email_optin'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='last_active_on',
            field=models.DateTimeField(null=True),
        ),
    ]
