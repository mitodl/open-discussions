# Generated by Django 2.2.20 on 2021-07-12 14:58

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0084_department_array")]

    operations = [
        migrations.AddField(
            model_name="course",
            name="extra_course_numbers",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=128),
                blank=True,
                null=True,
                size=None,
            ),
        )
    ]