# Generated by Django 2.1.11 on 2019-10-02 17:17

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('course_catalog', '0041_runs_for_programs'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='CourseRun',
            new_name='LearningResourceRun',
        ),
    ]
