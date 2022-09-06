# Generated by Django 2.2.27 on 2022-08-31 20:36
from django.db import migrations, models, transaction
from django.db.models import Count, Q

from search.task_helpers import upsert_course


def remove_dupes(apps, schema_editor):
    """
    Find CourseInstructors with dupe full names, pick the one with most info to keep,
    delete the other(s), update affected LearningResourceRuns
    """
    CourseInstructor = apps.get_model("course_catalog", "CourseInstructor")
    dupes = (
        CourseInstructor.objects.values("full_name")
        .annotate(dcount=Count("full_name"))
        .filter(dcount__gte=2)
        .order_by("full_name")
    )
    for dupe in dupes:
        best_dupe = None
        dupe_instructors = CourseInstructor.objects.filter(full_name=dupe["full_name"])
        for instructor in dupe_instructors:
            if instructor.first_name or instructor.last_name:
                best_dupe = instructor
                break
        if not best_dupe:
            best_dupe = dupe_instructors.order_by("created_on").first()
        for instructor in dupe_instructors.exclude(id=best_dupe.id):
            with transaction.atomic():
                for run in instructor.runs.all():
                    run.instructors.set(
                        CourseInstructor.objects.filter(
                            Q(id__in=run.instructors.values_list("id", flat=True))
                            | Q(id=best_dupe.id)
                        ).exclude(id=instructor.id)
                    )
                    upsert_course(run.object_id)
                instructor.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("course_catalog", "0091_instructor_runs"),
    ]

    operations = [
        migrations.RunPython(remove_dupes, reverse_code=migrations.RunPython.noop)
    ]