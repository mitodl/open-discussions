# Generated by Django 2.2.10 on 2020-05-19 20:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0071_update_podcast_episode_default_name")]

    operations = [
        migrations.AddField(
            model_name="podcastepisode",
            name="episode_link",
            field=models.URLField(max_length=2048, null=True),
        )
    ]
