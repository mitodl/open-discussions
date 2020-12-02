"""Management command for splitting OCW courses by run"""

from django.core.management import BaseCommand
from django.conf import settings

from course_catalog.api import split_ocw_courses_by_run
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Split OCW courses, 1 course per run"""

    help = "Split OCW courses, 1 course per run"

    def add_arguments(self, parser):
        parser.add_argument(
            "-c",
            "--chunk-size",
            dest="chunk_size",
            default=settings.OCW_ITERATOR_CHUNK_SIZE,
            help="Chunk size for course iterator",
        )

    def handle(self, *args, **options):
        self.stdout.write(f"Splitting OCW courses by run")
        chunk_size = options["chunk_size"]
        start = now_in_utc()
        split_ocw_courses_by_run(chunk_size=chunk_size)
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "OCW course split finished, took {} seconds, please reindex".format(
                total_seconds
            )
        )
