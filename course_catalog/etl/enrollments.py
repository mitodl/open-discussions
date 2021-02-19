"""Course run enrollments"""
import pyathena
import pytz
from pyathena.cursor import DictCursor
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from course_catalog.models import LearningResourceRun, Course, Enrollment


def athena_cursor():
    """Returns authorized pyathena cursor"""
    return pyathena.connect(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        work_group=settings.ATHENA_WORK_GROUP,
        cursor_class=DictCursor,
        region_name=settings.ATHENA_REGION_NAME,
    ).cursor()


def update_enrollments_for_user(user):
    """
    Updates enrollment data for a singe user

    Args:
        user (User): user to fetch enrollments for
    """

    query = """
        SELECT 
            enrollment_course_id,
            enrollment_created
        FROM "{database}"."{table}" 
        WHERE email = '{email}'
        """.format(
        database=settings.ATHENA_MITX_DATABASE,
        table=settings.ATHENA_MITX_ENROLLMENTS_TABLE,
        email=user.email,
    )

    print(query)

    cursor = athena_cursor()
    cursor.execute(query)

    for result in cursor:
        run_id = result["enrollment_course_id"]
        run_id_parts = run_id.split("/")

        run_regex_string = ".*{course_code}.*{run_code}.*".format(
            course_code=run_id_parts[1], run_code=run_id_parts[2]
        )
        run = LearningResourceRun.objects.filter(
            run_id__regex=run_regex_string,
            content_type=ContentType.objects.get(model="course").id,
            published=True,
        ).last()

        if run:
            course = run.content_object
        else:
            course = Course.objects.filter(
                course_id__contains=run_id_parts[1], published=True
            ).last()

        timezone = pytz.timezone("UTC")
        enrollment_timestamp = timezone.localize(result["enrollment_created"])

        Enrollment.objects.update_or_create(
            user=user,
            enrollments_table_run_id=run_id,
            enrollment_timestamp=enrollment_timestamp,
            defaults={"course": course, "run": run},
        )
