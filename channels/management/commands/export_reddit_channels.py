"""Export channels from Reddit to database"""
from django.db import transaction
from channels.models import Channel
from ._base_reddit_export import BaseRedditExportCommand


class Command(BaseRedditExportCommand):
    help = "Export all channels from Reddit to database"

    def handle(self, *args, **options):
        self.setup(options)

        self.stdout.write("Exporting channels from Reddit...")

        try:
            # For now, get existing channels from DB and update them
            for channel in Channel.objects.all():
                if self.limit and self.stats["processed"] >= self.limit:
                    break

                try:
                    self.process_channel(channel)
                    self.stats["processed"] += 1

                    if self.stats["processed"] % 10 == 0:
                        self.log_progress(
                            f'Processed {self.stats["processed"]} channels'
                        )

                except Exception as e:
                    self.stats["errors"] += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error processing channel {channel.name}: {e}"
                        )
                    )

            self.log_final_stats()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Fatal error: {e}"))
            raise

    def process_channel(self, channel):
        """Process a single channel"""
        # Get subreddit from Reddit
        subreddit = self.api.reddit.subreddit(channel.name)

        # Extract channel data
        channel_data = {
            "title": subreddit.title,
            "public_description": subreddit.public_description
            if hasattr(subreddit, "public_description")
            else "",
            "channel_type": subreddit.subreddit_type
            if hasattr(subreddit, "subreddit_type")
            else "public",
            "reddit_id": subreddit.id,
            "archived_on": self.export_timestamp,
        }

        # Handle about field if it exists
        if hasattr(subreddit, "description") and subreddit.description:
            if channel.about is None:
                channel_data["about"] = {}
            else:
                channel_data["about"] = channel.about
            channel_data["about"]["description"] = subreddit.description

        if self.dry_run:
            self.stdout.write(f"Would update channel: {channel.name}")
            self.stats["updated"] += 1
            return

        # Update channel
        with transaction.atomic():
            for key, value in channel_data.items():
                setattr(channel, key, value)
            channel.save()
            self.stats["updated"] += 1
