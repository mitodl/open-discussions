# Generated by Django 2.1.10 on 2019-07-29 20:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0029_depopulate_bootcamps_from_courses")]

    operations = [
        migrations.AlterField(
            model_name="bootcamp",
            name="instructors",
            field=models.ManyToManyField(
                blank=True,
                related_name="bootcamps",
                to="course_catalog.CourseInstructor",
            ),
        )
    ]
