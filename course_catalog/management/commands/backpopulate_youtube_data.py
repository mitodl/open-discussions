"""Management command for populating youtube course data"""
from django.core.management import BaseCommand

from course_catalog.constants import PlatformType
from course_catalog.models import Video
from course_catalog.tasks import get_youtube_data
from open_discussions.utils import now_in_utc
from search.task_helpers import delete_video


class Command(BaseCommand):
    """Populate youtube videos"""

    help = """Populates youtube videos"""

    def add_arguments(self, parser):
        """Configure arguments for this command"""
        subparsers = parser.add_subparsers(dest="command")

        # delete subcommand
        subparsers.add_parser("delete", help="Delete all existing records first")

        # fetch subcommand
        fetch_parser = subparsers.add_parser(
            "fetch", help="Fetches video data, defaulting to recently published ones"
        )
        fetch_parser.add_argument(
            "-c",
            "--channel-id",
            dest="channel_ids",
            action="append",
            default=None,
            help="Only fetch channels specified by channel id",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate youtube videos"""
        command = options["command"]
        if command == "delete":
            videos = Video.objects.filter(platform=PlatformType.youtube.value)
            self.stdout.write(
                f"Deleting {videos.count()} existing YouTube videos from database and ElasticSearch"
            )
            for video in videos:
                video.delete()
                delete_video(video)
            self.stdout.write("Complete")
        elif command == "fetch":
            channel_ids = options["channel_ids"]
            task = get_youtube_data.delay(channel_ids=channel_ids)
            self.stdout.write(f"Started task {task} to get YouTube video data")
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            result = task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                f"Fetched {result} YouTube channel in {total_seconds} seconds"
            )
