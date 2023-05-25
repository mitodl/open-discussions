"""Management command for populating ocw course data"""
from django.core.management import BaseCommand

from course_catalog.models import LearningResourceRun
from course_catalog.tasks import get_ocw_next_data
from course_catalog.constants import PlatformType
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
            "--course-url-substring",
            dest="course_url_substring",
            required=False,
            help="If set, backpopulate only courses whose urls match with this substring",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate ocw courses"""
        course_url_substring = options.get("course_url_substring")
        if options["delete"]:
            if course_url_substring:
                self.stdout.write(
                    "Deleting course={course_url_substring}".format(
                        course_url_substring=course_url_substring
                    )
                )
                runs = LearningResourceRun.objects.filter(
                    slug=course_url_substring, platform=PlatformType.ocw.value
                )

                for run in runs:
                    course = run.content_object
                    course.published = False
                    course.save()
                    deindex_course(course)
            else:
                self.stdout.write(
                    "You must specify a course_url_substring with --delete"
                )

        else:
            start = now_in_utc()

            task = get_ocw_next_data.delay(
                force_overwrite=options["force_overwrite"],
                course_url_substring=course_url_substring,
                utc_start_timestamp=start.strftime(ISOFORMAT),
            )

            self.stdout.write(
                "Started task {task} to get ocw next course data "
                "w/force_overwrite={overwrite}, course_url_substring={course_url_substring}".format(
                    task=task,
                    overwrite=options["force_overwrite"],
                    course_url_substring=course_url_substring,
                )
            )
            self.stdout.write("Waiting on task...")
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of ocw data finished, took {} seconds".format(total_seconds)
            )
