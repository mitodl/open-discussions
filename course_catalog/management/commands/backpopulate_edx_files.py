"""Management command for populating MITx course run file data"""

from django.core.management import BaseCommand

from course_catalog.tasks import import_all_mitx_files
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Populate MITx course run files"""

    help = "Populate MITx course run files"

    def add_arguments(self, parser):
        parser.add_argument(
            "-c",
            "--chunk-size",
            dest="chunk_size",
            default=1000,
            help="Chunk size for batch import task",
        )

    def handle(self, *args, **options):
        """Run Populate MITX course run files"""
        chunk_size = options["chunk_size"]
        task = import_all_mitx_files.delay(chunk_size=chunk_size)
        self.stdout.write(
            "Started task {task} to get MITX course run file data".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of MITX file data finished, took {} seconds".format(
                total_seconds
            )
        )
