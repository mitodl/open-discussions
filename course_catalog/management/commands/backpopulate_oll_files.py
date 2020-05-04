"""Management command for populating ContentFiles from OLL OLX data"""

from django.core.management import BaseCommand

from course_catalog.tasks import import_all_oll_files
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Populate xpro course run files"""

    help = "Populate OLL OLX data"

    def add_arguments(self, parser):
        parser.add_argument(
            "-c",
            "--chunk-size",
            dest="chunk_size",
            default=1000,
            help="Chunk size for batch import task",
        )

    def handle(self, *args, **options):
        """Run Populate OLL OLX files"""
        chunk_size = options["chunk_size"]
        task = import_all_oll_files.delay(chunk_size=chunk_size)
        self.stdout.write(f"Started task {task} to get OLL OLX data")
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            f"Population of xpro file data finished, took {total_seconds} seconds"
        )
