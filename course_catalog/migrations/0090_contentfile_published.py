# Generated by Django 2.2.24 on 2022-01-31 13:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0089_contentfile_learning_resource_types")]

    operations = [
        migrations.AddField(
            model_name="contentfile",
            name="published",
            field=models.BooleanField(default=True),
        )
    ]
