"""Management command to index reddit content"""
from django.core.management.base import BaseCommand, CommandError

from channels.constants import POST_TYPE, COMMENT_TYPE
from open_discussions.utils import now_in_utc
from search.constants import VALID_OBJECT_TYPES, PROFILE_TYPE, COURSE_TYPE
from search.tasks import start_recreate_index


class Command(BaseCommand):
    """Indexes reddit content"""

    help = "Add content to elasticsearch index"

    def add_arguments(self, parser):
        parser.add_argument(
            "--index", nargs="*", choices=[POST_TYPE, PROFILE_TYPE, COURSE_TYPE]
        )

    def handle(self, *args, **options):
        """Index the comments and posts for the channels the user is subscribed to"""

        indices = options["index"] or VALID_OBJECT_TYPES

        # make sure comments are included with posts
        if POST_TYPE in indices and COMMENT_TYPE not in indices:
            indices.append(COMMENT_TYPE)

        task = start_recreate_index.delay(indices=indices)
        self.stdout.write(
            "Started celery task {task} to index content".format(task=task)
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
