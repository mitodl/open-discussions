"""Management command for deleting non-course files from S3"""
from django.core.management import BaseCommand

from course_catalog.constants import NON_COURSE_DIRECTORIES
from course_catalog.api import get_ocw_learning_course_bucket


class Command(BaseCommand):
    """Delete non-course files from S3"""

    help = """Delete non-course files from S3"""

    def handle(self, *args, **options):
        bucket = get_ocw_learning_course_bucket()
        prefixes = [
            prefix.split("/")[-1]  # pylint:disable=use-maxsplit-arg
            for prefix in NON_COURSE_DIRECTORIES
        ]

        self.stdout.write("Searching for non-courses")
        for bucket_file in bucket.objects.all():
            if bucket_file.key.split("/")[0] in prefixes:
                self.stdout.write(f"Deleting {bucket_file.key}")
                bucket.delete_objects(Delete={"Objects": [{"Key": bucket_file.key}]})
        self.stdout.write("Finished")
