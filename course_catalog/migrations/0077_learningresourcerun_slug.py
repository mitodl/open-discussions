# Generated by Django 2.2.13 on 2020-09-03 18:08

from django.db import migrations, models

from course_catalog.constants import PlatformType


def backfill_slug(apps, schema_editor):
    """
    Backfills slug values for existing LearningResourceRuns
    """
    LearningResourceRun = apps.get_model("course_catalog", "LearningResourceRun")
    for run in LearningResourceRun.objects.filter(
        platform=PlatformType.ocw.value
    ).iterator():
        run.slug = run.raw_json.get("short_url")
        run.save()


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0076_podcast_rss_url")]

    operations = [
        migrations.AddField(
            model_name="learningresourcerun",
            name="slug",
            field=models.CharField(blank=True, max_length=1024, null=True),
        ),
        migrations.RunPython(backfill_slug, reverse_code=migrations.RunPython.noop),
    ]
