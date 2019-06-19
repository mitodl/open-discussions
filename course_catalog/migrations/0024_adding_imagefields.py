# Generated by Django 2.1.7 on 2019-05-30 06:59

import course_catalog.utils
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("course_catalog", "0023_adds_new_learning_resources_and_lists_20190528")
    ]

    operations = [
        migrations.AlterField(
            model_name="learningpath",
            name="image_src",
            field=models.ImageField(
                max_length=2083,
                null=True,
                upload_to=course_catalog.utils.user_list_image_upload_uri,
            ),
        ),
        migrations.AlterField(
            model_name="program",
            name="image_src",
            field=models.ImageField(
                max_length=2083,
                null=True,
                upload_to=course_catalog.utils.program_image_upload_uri,
            ),
        ),
    ]
