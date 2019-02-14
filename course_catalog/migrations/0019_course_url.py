# Generated by Django 2.1.5 on 2019-02-13 15:04

from django.db import migrations, models

from course_catalog.task_helpers import get_course_url


def populate_urls(apps, schema_editor):
    """
    Calculates url's for courses
    """
    Course = apps.get_model("course_catalog", "Course")
    for course in Course.objects.iterator():
        course.url = get_course_url(course.course_id, course.raw_json, course.platform)
        course.save(update_fields=["url"])


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0018_changes_is_resource_field_20190131_2152")]

    operations = [
        migrations.AddField(
            model_name="course",
            name="url",
            field=models.URLField(null=True, max_length=2048),
        ),
        migrations.RunPython(populate_urls, reverse_code=migrations.RunPython.noop),
    ]
