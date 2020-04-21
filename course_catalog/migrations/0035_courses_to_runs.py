# Generated by Django 2.1.10 on 2019-08-21 20:10

from django.db import migrations, models, transaction
import django.db.models.deletion

from search.task_helpers import delete_course


def delete_resources(apps, schema_editor):
    """
    Delete all courses, runs, and bootcamps.  They will need to be imported again.
    """
    Course = apps.get_model("course_catalog", "Course")
    CourseRun = apps.get_model("course_catalog", "CourseRun")
    Bootcamp = apps.get_model("course_catalog", "Bootcamp")

    CourseRun.objects.all().delete()
    for course in Course.objects.all():
        course.delete()
        delete_course(course)
    for bootcamp in Bootcamp.objects.all():
        bootcamp.delete()


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        ("course_catalog", "0034_change_userlist_verbose_name"),
    ]

    operations = [
        migrations.RunPython(delete_resources, reverse_code=migrations.RunPython.noop),
        migrations.RemoveField(model_name="bootcamp", name="availability"),
        migrations.RemoveField(model_name="bootcamp", name="end_date"),
        migrations.RemoveField(model_name="bootcamp", name="enrollment_end"),
        migrations.RemoveField(model_name="bootcamp", name="enrollment_start"),
        migrations.RemoveField(model_name="bootcamp", name="instructors"),
        migrations.RemoveField(model_name="bootcamp", name="language"),
        migrations.RemoveField(model_name="bootcamp", name="prices"),
        migrations.RemoveField(model_name="bootcamp", name="start_date"),
        migrations.RemoveField(model_name="bootcamp", name="year"),
        migrations.RemoveField(model_name="course", name="availability"),
        migrations.RemoveField(model_name="course", name="end_date"),
        migrations.RemoveField(model_name="course", name="enrollment_end"),
        migrations.RemoveField(model_name="course", name="enrollment_start"),
        migrations.RemoveField(model_name="course", name="instructors"),
        migrations.RemoveField(model_name="course", name="language"),
        migrations.RemoveField(model_name="course", name="level"),
        migrations.RemoveField(model_name="course", name="prices"),
        migrations.RemoveField(model_name="course", name="semester"),
        migrations.RemoveField(model_name="course", name="start_date"),
        migrations.RemoveField(model_name="course", name="year"),
        migrations.AlterField(
            model_name="courserun",
            name="instructors",
            field=models.ManyToManyField(
                blank=True,
                related_name="course_instructors",
                to="course_catalog.CourseInstructor",
            ),
        ),
        migrations.AddField(
            model_name="courserun",
            name="content_type",
            field=models.ForeignKey(
                limit_choices_to={"model__in": ("course", "bootcamp")},
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="contenttypes.ContentType",
            ),
        ),
        migrations.AddField(
            model_name="courserun",
            name="object_id",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.AlterField(
            model_name="courserun",
            name="course",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="deprecated_runs",
                to="course_catalog.Course",
            ),
        ),
        migrations.RunPython(migrations.RunPython.noop, reverse_code=delete_resources),
    ]
