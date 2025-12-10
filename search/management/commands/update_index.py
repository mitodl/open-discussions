"""Management command to index reddit content"""
from django.core.management.base import BaseCommand, CommandError

from course_catalog.constants import PlatformType
from open_discussions.utils import now_in_utc
from search.constants import COURSE_TYPE, RESOURCE_FILE_TYPE, VALID_OBJECT_TYPES
from search.tasks import start_update_index

valid_object_types = list(VALID_OBJECT_TYPES)
valid_object_types.append(RESOURCE_FILE_TYPE)


class Command(BaseCommand):
    """Indexes opensearch content"""

    help = "Update opensearch index"

    def add_arguments(self, parser):
        allowed_course_platforms = [
            platform.value
            for platform in PlatformType
            if platform.value
            not in [PlatformType.youtube.value, PlatformType.podcast.value]
        ]

        parser.add_argument(
            "--all", dest="all", action="store_true", help="Update all indexes"
        )

        for object_type in sorted(valid_object_types):
            parser.add_argument(
                f"--{object_type}s",
                dest=object_type,
                action="store_true",
                help=f"Update the {object_type} index",
            )

        parser.add_argument(
            "--course_platform",
            action="store",
            dest="platform",
            default=None,
            choices=allowed_course_platforms,
            help="Filter courses and course files update by platform.",
        )

        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Index the comments and posts for the channels the user is subscribed to"""
        if options["all"]:
            task = start_update_index.delay(valid_object_types, options["platform"])
            self.stdout.write(
                f"Started celery task {task} to update index content for all indexes"
            )
            if options["platform"]:
                self.stdout.write(
                    "Only updating course and course document indexes for {platform}".format(
                        platform=options["platform"]
                    )
                )
        else:
            indexes_to_update = list(
                filter(lambda object_type: options[object_type], valid_object_types)
            )
            if not indexes_to_update:
                self.stdout.write("Must select at least one index to update")
                self.stdout.write("The following are valid index options:")
                self.stdout.write("  --all")
                for object_type in sorted(valid_object_types):
                    self.stdout.write(f"  --{object_type}s")
                return
            if (
                COURSE_TYPE in indexes_to_update
                and RESOURCE_FILE_TYPE not in indexes_to_update
            ):
                self.stderr.write(
                    "WARNING: Courses will be updated but not course content files"
                )
            task = start_update_index.delay(indexes_to_update, options["platform"])
            self.stdout.write(
                f"Started celery task {task} to update index content for the following indexes: {indexes_to_update}"
            )

            if options["platform"]:
                self.stdout.write(
                    "Only updating course and course document indexes for {platform}".format(
                        platform=options["platform"]
                    )
                )

        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        errors = task.get()
        errors = [error for error in errors if error is not None]
        if errors:
            raise CommandError(f"Update index errored: {errors}")

        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(f"Update index finished, took {total_seconds} seconds")
