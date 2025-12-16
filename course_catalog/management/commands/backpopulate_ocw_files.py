"""Management command for populating ocw course run file data"""

from django.core.management import BaseCommand

from course_catalog.tasks import import_all_ocw_files
from open_discussions import settings
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Populate ocw course run files"""

    help = "Populate ocw course run files"

    def add_arguments(self, parser):
        parser.add_argument(
            "-c",
            "--chunk-size",
            dest="chunk_size",
            default=settings.OCW_ITERATOR_CHUNK_SIZE,
            type=int,
            help="Chunk size for batch import task",
        )

    def handle(self, *args, **options):
        """Run Populate ocw course run files"""
        chunk_size = options["chunk_size"]
        task = import_all_ocw_files.delay(chunk_size=chunk_size)
        self.stdout.write(
            f"Started task {task} to get ocw course run file data w/chunk size {chunk_size}"
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            f"Population of ocw file data finished, took {total_seconds} seconds"
        )
