"""Management command for populating see course data"""
from django.core.management import BaseCommand

from course_catalog.models import Podcast, PodcastEpisode
from course_catalog.tasks import get_podcast_data
from open_discussions.utils import now_in_utc
from search.search_index_helpers import deindex_podcast, deindex_podcast_episode


class Command(BaseCommand):
    """Populate podcasts"""

    help = "Populate podcasts"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing records first",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate Sloan courses"""
        if options["delete"]:
            self.stdout.write("Deleting all existing Podcasts courses from database")
            for podcast_episode in PodcastEpisode.objects.all():
                deindex_podcast_episode(podcast_episode)
                podcast_episode.delete()
            for podcast in Podcast.objects.all():
                deindex_podcast(podcast)
                podcast.delete()

        else:
            task = get_podcast_data.delay()
            self.stdout.write(f"Started task {task} to get podcast data")
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of podcast data finished, took {} seconds".format(
                    total_seconds
                )
            )
