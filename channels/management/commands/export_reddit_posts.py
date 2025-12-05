"""Export posts from Reddit to database"""
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from channels.models import Channel, Post
from open_discussions.utils import markdown_to_plain_text
from ._base_reddit_export import BaseRedditExportCommand


class Command(BaseRedditExportCommand):
    help = "Export all posts from Reddit to database"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            "--channel", type=str, help="Export posts from specific channel only"
        )

    def handle(self, *args, **options):
        self.setup(options)

        channel_name = options.get("channel")

        if channel_name:
            self.stdout.write(f"Exporting posts from channel: {channel_name}")
            channels = [Channel.objects.get(name=channel_name)]
        else:
            self.stdout.write("Exporting posts from all channels...")
            channels = Channel.objects.all()

        for channel in channels:
            self.export_channel_posts(channel)

        self.log_final_stats()

    def export_channel_posts(self, channel):
        """Export all posts from a channel"""
        self.stdout.write(f"\nProcessing channel: {channel.name}")

        try:
            # Get subreddit from Reddit
            subreddit = self.api.reddit.subreddit(channel.name)

            # Iterate through all posts (new posts first)
            for submission in subreddit.new(limit=None):
                if self.limit and self.stats["processed"] >= self.limit:
                    break

                try:
                    self.process_post(submission, channel)
                    self.stats["processed"] += 1

                    if self.stats["processed"] % 100 == 0:
                        self.log_progress(f'Processed {self.stats["processed"]} posts')

                except Exception as e:
                    self.stats["errors"] += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error processing post {submission.id}: {e}")
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error fetching posts for {channel.name}: {e}")
            )

    def process_post(self, submission, channel):
        """Process a single post"""
        # Get or create author
        author = None
        if hasattr(submission, "author") and submission.author:
            try:
                author_name = submission.author.name
                author, _ = User.objects.get_or_create(
                    username=author_name,
                    defaults={"email": f"{author_name}@archived.local"},
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to get or create user '{author_name}': {e}"))

        # Determine post type and extract content
        post_type = "self" if submission.is_self else "link"
        text = submission.selftext if submission.is_self else None
        url = None if submission.is_self else submission.url

        # Generate plain text version
        plain_text = None
        if text:
            plain_text = markdown_to_plain_text(text)

        # Extract post data
        post_data = {
            "reddit_id": submission.id,
            "channel": channel,
            "author": author,
            "title": submission.title,
            "url": url,
            "text": text,
            "cached_plain_text": plain_text,
            "post_type": post_type,
            "score": submission.score,
            "num_comments": submission.num_comments,
            "created": timezone.datetime.fromtimestamp(
                submission.created_utc, tz=timezone.utc
            ),
            "removed": submission.banned_by is not None
            if hasattr(submission, "banned_by")
            else False,
            "deleted": submission.author is None,
            "archived_on": self.export_timestamp,
        }

        if self.dry_run:
            self.stdout.write(f'Would create/update post: {post_data["reddit_id"]}')
            self.stats["created"] += 1
            return

        # Create or update post
        with transaction.atomic():
            post, created = Post.objects.update_or_create(
                reddit_id=post_data["reddit_id"], defaults=post_data
            )

            if created:
                self.stats["created"] += 1
            else:
                self.stats["updated"] += 1
