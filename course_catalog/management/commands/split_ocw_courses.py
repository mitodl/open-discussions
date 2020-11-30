"""Management command for splitting OCW courses by run"""

from django.core.management import BaseCommand

from course_catalog.api import split_ocw_courses_by_run
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Split OCW courses, 1 course per run"""

    help = "Split OCW courses, 1 course per run"

    def handle(self, *args, **options):
        self.stdout.write(f"Splitting OCW courses by run")
        start = now_in_utc()
        split_ocw_courses_by_run()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write("OCW course split, took {} seconds".format(total_seconds))
