"""Verify Reddit export data integrity"""
from django.core.management.base import BaseCommand
from channels.models import Channel, Post, Comment, CommentTreeNode


class Command(BaseCommand):
    help = "Verify data integrity after Reddit export"

    def handle(self, *args, **options):
        self.stdout.write("Verifying Reddit export...\n")

        errors = []

        # Verify channels
        channel_count = Channel.objects.count()
        channels_with_reddit_id = Channel.objects.filter(
            reddit_id__isnull=False
        ).count()
        self.stdout.write(f"✓ Channels: {channel_count}")
        self.stdout.write(f"  - With reddit_id: {channels_with_reddit_id}")

        # Verify posts
        post_count = Post.objects.count()
        posts_with_reddit_id = Post.objects.filter(reddit_id__isnull=False).count()
        posts_with_score = Post.objects.filter(score__isnull=False).count()

        self.stdout.write(f"✓ Posts: {post_count}")
        self.stdout.write(f"  - With reddit_id: {posts_with_reddit_id}")
        self.stdout.write(f"  - With score: {posts_with_score}")

        if post_count > 0 and posts_with_reddit_id < post_count:
            errors.append(
                f"Posts without reddit_id: {post_count - posts_with_reddit_id}"
            )

        # Verify comments
        comment_count = Comment.objects.count()
        comments_with_reddit_id = Comment.objects.filter(
            reddit_id__isnull=False
        ).count()

        self.stdout.write(f"✓ Comments: {comment_count}")
        self.stdout.write(f"  - With reddit_id: {comments_with_reddit_id}")

        if comment_count > 0 and comments_with_reddit_id < comment_count:
            errors.append(
                f"Comments without reddit_id: {comment_count - comments_with_reddit_id}"
            )

        # Verify comment trees
        posts_with_trees = CommentTreeNode.objects.values("post").distinct().count()
        total_tree_nodes = CommentTreeNode.objects.count()

        self.stdout.write(f"✓ Comment Trees: {posts_with_trees} posts")
        self.stdout.write(f"  - Total tree nodes: {total_tree_nodes}")

        # Verify tree integrity
        if comment_count > 0:
            orphaned_comments = Comment.objects.filter(tree_node__isnull=True).count()
            if orphaned_comments > 0:
                errors.append(f"Orphaned comments (no tree node): {orphaned_comments}")

        # Check for posts without trees
        posts_without_trees = Post.objects.exclude(
            id__in=CommentTreeNode.objects.values_list("post_id", flat=True)
        ).count()
        if posts_without_trees > 0:
            self.stdout.write(f"  - Posts without trees: {posts_without_trees}")

        # Report results
        self.stdout.write("\n" + "=" * 50)
        if errors:
            self.stdout.write(self.style.ERROR("\nERRORS FOUND:"))
            for error in errors:
                self.stdout.write(self.style.ERROR(f"  - {error}"))
        else:
            self.stdout.write(self.style.SUCCESS("\n✓ All verifications passed!"))
