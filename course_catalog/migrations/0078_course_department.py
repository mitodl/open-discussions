# Generated by Django 2.2.13 on 2020-09-03 18:42

from django.db import migrations, models
from course_catalog.constants import PlatformType


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0077_learningresourcerun_slug")]

    def backfill_department(apps, schema_editor):
        """
        Backfills department values for existing Courses
        """
        Course = apps.get_model("course_catalog", "Course")
        LearningResourceRun = apps.get_model("course_catalog", "LearningResourceRun")
        ContentType = apps.get_model("contenttypes", "ContentType")

        for course in Course.objects.filter(platform=PlatformType.ocw.value).iterator():
            course_run = LearningResourceRun.objects.filter(
                content_type=ContentType.objects.get(model="course").id,
                object_id=course.id,
                raw_json__isnull=False,
            ).last()

            if course_run:
                course.department = course_run.raw_json.get("department_number")
                course.save()

    operations = [
        migrations.AddField(
            model_name="course",
            name="department",
            field=models.CharField(blank=True, max_length=256, null=True),
        ),
        migrations.RunPython(
            backfill_department, reverse_code=migrations.RunPython.noop
        ),
    ]
