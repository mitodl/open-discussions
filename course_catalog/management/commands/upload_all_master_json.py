"""Management command for uploading master json data for OCW courses"""
from django.core.management import BaseCommand

from course_catalog.tasks import upload_ocw_parsed_json
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Upload OCW master json"""

    help = "Upload OCW master json"

    def handle(self, *args, **options):
        """Run Upload OCW master json"""
        task = upload_ocw_parsed_json.delay()
        self.stdout.write(
            f"Started celery task {task} to upload ocw master json files to s3"
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            f"Finished uploading ocw master json files to s3, took {total_seconds} seconds"
        )
