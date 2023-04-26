"""Management command to index reddit content"""
from django.core.management.base import BaseCommand, CommandError

from open_discussions.utils import now_in_utc
from search.tasks import start_recreate_index
from search.constants import VALID_OBJECT_TYPES


class Command(BaseCommand):
    """Indexes reddit content"""

    help = "Recreate elasticsearch index"

    def add_arguments(self, parser):
        parser.add_argument(
            "--all", dest="all", action="store_true", help="Recreate all indexes"
        )

        for object_type in sorted(VALID_OBJECT_TYPES):
            parser.add_argument(
                f"--{object_type}s",
                dest=object_type,
                action="store_true",
                help=f"Recreate the {object_type} index",
            )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Index the comments and posts for the channels the user is subscribed to"""
        if options["all"]:
            task = start_recreate_index.delay(list(VALID_OBJECT_TYPES))
            self.stdout.write(
                "Started celery task {task} to index content for all indexes".format(
                    task=task
                )
            )
        else:
            indexes_to_update = list(
                filter(lambda object_type: options[object_type], VALID_OBJECT_TYPES)
            )
            if not indexes_to_update:
                self.stdout.write("Must select at least one index to update")
                self.stdout.write("The following are valid index options:")
                self.stdout.write("  --all")
                for object_type in sorted(VALID_OBJECT_TYPES):
                    self.stdout.write(f"  --{object_type}s")
                return

            task = start_recreate_index.delay(indexes_to_update)
            self.stdout.write(
                "Started celery task {task} to index content for the following indexes: {indexes}".format(
                    task=task, indexes=indexes_to_update
                )
            )

        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        error = task.get()
        if error:
            raise CommandError(f"Recreate index errored: {error}")

        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Recreate index finished, took {} seconds".format(total_seconds)
        )
