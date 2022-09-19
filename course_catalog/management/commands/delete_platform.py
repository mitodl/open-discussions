"""Management command for deleting courses"""
import sys

from django.core.management import BaseCommand

from course_catalog.models import Course, Video
from search.task_helpers import delete_course, delete_video


class Command(BaseCommand):
    """Delete objects of a specific platform from database"""

    help = """Delete courses from database"""

    def add_arguments(self, parser):
        parser.add_argument(
            "platform",
            nargs="+",
            type=str,
            help="Delete all courses from this platform",
        )

    def handle(self, *args, **options):
        for platform in options["platform"]:
            idx = 0
            for course in Course.objects.filter(platform=platform):
                delete_course(course)
                course.delete()
                idx += 1
            sys.stdout.write(f"Removed {idx} courses from platform {platform}\n")
            idx = 0
            for video in Video.objects.filter(platform=platform):
                delete_video(video)
                video.delete()
                idx += 1
            sys.stdout.write(f"Removed {idx} videos from platform {platform}\n")
