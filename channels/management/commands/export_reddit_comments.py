"""Export comments from Reddit to database"""
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from channels.models import Post, Comment
from ._base_reddit_export import BaseRedditExportCommand


class Command(BaseRedditExportCommand):
    help = "Export all comments from Reddit to database"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            "--post-id",
            type=str,
            help="Export comments from specific post only (reddit_id)",
        )

    def handle(self, *args, **options):
        self.setup(options)

        post_id = options.get("post_id")

        if post_id:
            self.stdout.write(f"Exporting comments from post: {post_id}")
            posts = [Post.objects.get(reddit_id=post_id)]
        else:
            self.stdout.write("Exporting comments from all posts...")
            posts = Post.objects.all()

        total_posts = posts.count() if hasattr(posts, "count") else len(posts)
        self.stdout.write(f"Processing {total_posts} posts")

        for idx, post in enumerate(posts, 1):
            if idx % 100 == 0:
                self.stdout.write(f"Processing post {idx}/{total_posts}")

            self.export_post_comments(post)

        self.log_final_stats()

    def export_post_comments(self, post):
        """Export all comments from a post"""
        try:
            # Get submission from Reddit
            submission = self.api.reddit.submission(id=post.reddit_id)

            # Replace MoreComments to get all comments
            submission.comments.replace_more(limit=None)

            # Flatten comment tree and process all comments
            for comment in submission.comments.list():
                if self.limit and self.stats["processed"] >= self.limit:
                    break

                try:
                    self.process_comment(comment, post)
                    self.stats["processed"] += 1

                    if self.stats["processed"] % 1000 == 0:
                        self.log_progress(
                            f'Processed {self.stats["processed"]} comments'
                        )

                except Exception as e:
                    self.stats["errors"] += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error processing comment {comment.id}: {e}")
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f"Error fetching comments for post {post.reddit_id}: {e}"
                )
            )

    def process_comment(self, reddit_comment, post):
        """Process a single comment"""
        # Get or create author
        author = None
        if hasattr(reddit_comment, "author") and reddit_comment.author:
            try:
                author_name = reddit_comment.author.name
                author, _ = User.objects.get_or_create(
                    username=author_name,
                    defaults={"email": f"{author_name}@archived.local"},
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to get or create user '{author_name}': {e}"))

        # Extract parent Reddit ID (comment or post)
        parent_reddit_id = None
        if reddit_comment.parent_id.startswith("t1_"):  # Comment parent
            parent_reddit_id = reddit_comment.parent_id[3:]  # Remove 't1_' prefix
        elif reddit_comment.parent_id.startswith("t3_"):  # Post parent
            parent_reddit_id = None  # Top-level comment

        comment_data = {
            "reddit_id": reddit_comment.id,
            "post": post,
            "author": author,
            "parent_reddit_id": parent_reddit_id,
            "text": reddit_comment.body,
            "score": reddit_comment.score,
            "created": timezone.datetime.fromtimestamp(
                reddit_comment.created_utc, tz=timezone.utc
            ),
            "removed": reddit_comment.banned_by is not None
            if hasattr(reddit_comment, "banned_by")
            else False,
            "deleted": reddit_comment.body == "[deleted]",
            "edited": reddit_comment.edited is not False,
            "archived_on": self.export_timestamp,
        }

        if self.dry_run:
            self.stats["created"] += 1
            return

        # Create or update comment
        with transaction.atomic():
            comment, created = Comment.objects.update_or_create(
                reddit_id=comment_data["reddit_id"], defaults=comment_data
            )

            if created:
                self.stats["created"] += 1
            else:
                self.stats["updated"] += 1
