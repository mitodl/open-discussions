"""Management command for populating youtube course data"""
from datetime import datetime
from django.core.management import BaseCommand
import pytz

from course_catalog.constants import PlatformType
from course_catalog.models import Video
from course_catalog.tasks import get_youtube_data, get_youtube_transcripts
from open_discussions.utils import now_in_utc
from open_discussions.constants import ISOFORMAT
from search.task_helpers import deindex_video


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

        # transcripts subcommand
        transcripts_parser = subparsers.add_parser(
            "transcripts", help="Fetches video transcript data"
        )
        transcripts_parser.add_argument(
            "--created-after",
            dest="created_after",
            default=None,
            help="Only fetch transcripts for videos indexed after timestamp (yyyy-mm-ddThh:mm:ssZ)",
        )
        transcripts_parser.add_argument(
            "--created-minutes",
            dest="created_minutes",
            default=None,
            help="Only fetch transcripts for videos indexed this number of minutes ago and later",
        )
        transcripts_parser.add_argument(
            "--overwrite",
            dest="overwrite",
            action="store_true",
            help="Overwrite any existing transcript records",
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
                deindex_video(video)
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
        elif command == "transcripts":
            created_after = options["created_after"]
            created_minutes = options["created_minutes"]
            overwrite = options["overwrite"]

            if created_after:
                try:
                    created_after = datetime.strptime(created_after, ISOFORMAT).replace(
                        tzinfo=pytz.UTC
                    )
                except ValueError:
                    self.stdout.write("Invalid date format")
                    return

            if created_minutes:
                try:
                    created_minutes = int(created_minutes)
                except ValueError:
                    self.stdout.write("created_minutes must be an integer")
                    return

            task = get_youtube_transcripts.delay(
                created_after=created_after,
                created_minutes=created_minutes,
                overwrite=overwrite,
            )
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(f"Completed in {total_seconds} seconds")
