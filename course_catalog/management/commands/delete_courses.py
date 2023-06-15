"""Management command for deleting courses"""
import sys

from django.core.management import BaseCommand

from course_catalog.models import Course, Video
from search.search_index_helpers import deindex_course, deindex_video


class Command(BaseCommand):
    """Delete courses of a specific platform from database"""

    help = """Delete courses from database"""

    def add_arguments(self, parser):
        parser.add_argument(
            "platform",
            nargs="+",
            type=str,
            help="Delete all courses from the specified platform(s)",
        )

    def handle(self, *args, **options):
        for platform in options["platform"]:
            idx = 0
            for course in Course.objects.filter(platform=platform):
                deindex_course(course)
                course.delete()
                idx += 1
            sys.stdout.write(f"Removed {idx} courses from platform {platform}\n")
