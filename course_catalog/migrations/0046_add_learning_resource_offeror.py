# Generated by Django 2.1.11 on 2019-10-11 16:40
import logging

from django.db import migrations, models

from course_catalog.constants import OfferedBy

log = logging.getLogger()


def populate_offerors(apps, schema_editor):
    """Populate all offerors"""
    Course = apps.get_model("course_catalog", "Course")
    LearningResourceRun = apps.get_model("course_catalog", "LearningResourceRun")
    Bootcamp = apps.get_model("course_catalog", "Bootcamp")
    Program = apps.get_model("course_catalog", "Bootcamp")
    LearningResourceOfferor = apps.get_model(
        "course_catalog", "LearningResourceOfferor"
    )

    # get or create the known OfferedBy
    offered_by_mapping = {
        o.value: LearningResourceOfferor.objects.get_or_create(name=o.value)[0]
        for o in OfferedBy
    }

    for program in Program.objects.all():
        if program._deprecated_offered_by in offered_by_mapping:
            program.offered_by.set([offered_by_mapping[program._deprecated_offered_by]])
            program.save()
        else:
            log.error(
                "Unknown Program._deprecated_offered_by '%s' for program '%s'",
                program._deprecated_offered_by,
                program.program_id,
            )

    for course in Course.objects.all():
        if course._deprecated_offered_by in offered_by_mapping:
            course.offered_by.set([offered_by_mapping[course._deprecated_offered_by]])
            course.save()
        else:
            log.error(
                "Unknown Course._deprecated_offered_by '%s' for course '%s'",
                course._deprecated_offered_by,
                course.course_id,
            )

    for run in LearningResourceRun.objects.all():
        if run._deprecated_offered_by in offered_by_mapping:
            run.offered_by.set([offered_by_mapping[run._deprecated_offered_by]])
            run.save()
        else:
            log.error(
                "Unknown LearningResourceRun._deprecated_offered_by '%s' for course '%s'",
                run._deprecated_offered_by,
                run.course_id,
            )

    for bootcamp in Bootcamp.objects.all():
        if bootcamp._deprecated_offered_by in offered_by_mapping:
            bootcamp.offered_by.set(
                [offered_by_mapping[bootcamp._deprecated_offered_by]]
            )
            bootcamp.save()
        else:
            log.error(
                "Unknown Bootcamp._deprecated_offered_by '%s' for bootcamp '%s'",
                bootcamp._deprecated_offered_by,
                bootcamp.course_id,
            )


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0045_deprecated_offered_by")]

    operations = [
        migrations.AddField(
            model_name="bootcamp",
            name="offered_by",
            field=models.ManyToManyField(
                blank=True, to="course_catalog.LearningResourceOfferor"
            ),
        ),
        migrations.AddField(
            model_name="course",
            name="offered_by",
            field=models.ManyToManyField(
                blank=True, to="course_catalog.LearningResourceOfferor"
            ),
        ),
        migrations.AddField(
            model_name="learningresourcerun",
            name="offered_by",
            field=models.ManyToManyField(
                blank=True, to="course_catalog.LearningResourceOfferor"
            ),
        ),
        migrations.AddField(
            model_name="program",
            name="offered_by",
            field=models.ManyToManyField(
                blank=True, to="course_catalog.LearningResourceOfferor"
            ),
        ),
        migrations.AddField(
            model_name="userlist",
            name="offered_by",
            field=models.ManyToManyField(
                blank=True, to="course_catalog.LearningResourceOfferor"
            ),
        ),
        migrations.RunPython(populate_offerors, reverse_code=migrations.RunPython.noop),
    ]
