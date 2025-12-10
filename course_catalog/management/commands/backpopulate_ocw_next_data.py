"""Management command for populating ocw course data"""
from django.core.management import BaseCommand

from course_catalog.constants import PlatformType
from course_catalog.models import LearningResourceRun
from course_catalog.tasks import get_ocw_next_data
from open_discussions.constants import ISOFORMAT
from open_discussions.utils import now_in_utc
from search.search_index_helpers import deindex_course


class Command(BaseCommand):
    """Populate ocw courses"""

    help = "Populate ocw courses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            dest="force_overwrite",
            action="store_true",
            help="Overwrite any existing records",
        )
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing records first",
        )
        parser.add_argument(
            "--course-name",
            dest="course_name",
            required=False,
            help="If set, backpopulate only the course with this name",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate ocw courses"""
        course_name = options.get("course_name")
        if options["delete"]:
            if course_name:
                self.stdout.write(
                    f"Deleting course={course_name}"
                )
                runs = LearningResourceRun.objects.filter(
                    slug=f"courses/{course_name}",
                    platform=PlatformType.ocw.value,
                )

                for run in runs:
                    course = run.content_object
                    course.published = False
                    course.save()
                    deindex_course(course)
            else:
                self.stdout.write("You must specify a course_name with --delete")

        else:
            start = now_in_utc()

            task = get_ocw_next_data.delay(
                force_overwrite=options["force_overwrite"],
                course_url_substring=course_name,
                utc_start_timestamp=start.strftime(ISOFORMAT),
            )

            self.stdout.write(
                "Started task {task} to get ocw next course data "
                "w/force_overwrite={overwrite}, course_name={course_name}".format(
                    task=task,
                    overwrite=options["force_overwrite"],
                    course_name=course_name,
                )
            )
            self.stdout.write("Waiting on task...")
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                f"Population of ocw data finished, took {total_seconds} seconds"
            )
