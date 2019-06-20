from django.db import migrations

from course_catalog.constants import AvailabilityType


def swap_availability(obj):
    if obj.availability == "Current":
        obj.availability = AvailabilityType.available_now.value
        obj.save(update_fields=["availability"])
    elif obj.availability == "Archived":
        obj.availability = AvailabilityType.prior.value
        obj.save(update_fields=["availability"])


def replace_availability(apps, schema_editor):
    """
    Replaces availability values for existing Courses and Bootcamps
    """
    Course = apps.get_model("course_catalog", "Course")
    for course in Course.objects.iterator():
        swap_availability(course)

    Bootcamp = apps.get_model("course_catalog", "Bootcamp")
    for bootcamp in Bootcamp.objects.iterator():
        swap_availability(bootcamp)


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0027_adds_unique_together_constraint")]

    operations = [
        migrations.RunPython(
            replace_availability, reverse_code=migrations.RunPython.noop
        )
    ]
