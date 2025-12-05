"""Build MaterializedPath trees for comments"""
from django.db import transaction
from collections import defaultdict
from channels.models import Post, Comment, CommentTreeNode
from ._base_reddit_export import BaseRedditExportCommand


class Command(BaseRedditExportCommand):
    help = "Build comment trees using MaterializedPath structure"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            "--rebuild", action="store_true", help="Rebuild trees even if they exist"
        )
        parser.add_argument(
            "--post-id", type=str, help="Build tree for specific post only"
        )

    def handle(self, *args, **options):
        self.setup(options)

        rebuild = options["rebuild"]
        post_id = options.get("post_id")

        if post_id:
            posts = [Post.objects.get(reddit_id=post_id)]
        else:
            posts = Post.objects.all()

        total_posts = posts.count() if hasattr(posts, "count") else len(posts)
        self.stdout.write(f"Building trees for {total_posts} posts")

        for idx, post in enumerate(posts, 1):
            if idx % 100 == 0:
                self.stdout.write(f"Processing post {idx}/{total_posts}")

            try:
                self.build_post_tree(post, rebuild)
                self.stats["processed"] += 1
            except Exception as e:
                self.stats["errors"] += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"Error building tree for post {post.reddit_id}: {e}"
                    )
                )

        self.log_final_stats()

    def build_post_tree(self, post, rebuild):
        """Build comment tree for a single post"""
        # Check if tree already exists
        if not rebuild and CommentTreeNode.objects.filter(post=post).exists():
            self.stats["skipped"] += 1
            return

        if rebuild:
            # Delete existing tree
            CommentTreeNode.objects.filter(post=post).delete()

        # Get all comments for this post
        comments = Comment.objects.filter(post=post).select_related("author")

        if not comments.exists():
            # Create just root node for posts with no comments
            if not self.dry_run:
                with transaction.atomic():
                    CommentTreeNode.add_root(
                        post=post, comment=None, score=0, created=post.created
                    )
            self.stats["created"] += 1
            return

        if self.dry_run:
            self.stdout.write(
                f"Would build tree for post {post.reddit_id} with {comments.count()} comments"
            )
            self.stats["created"] += 1
            return

        # Build tree structure
        with transaction.atomic():
            # Create root node
            root = CommentTreeNode.add_root(
                post=post, comment=None, score=0, created=post.created
            )

            # Group comments by parent
            children_dict = defaultdict(list)

            for comment in comments:
                parent_id = comment.parent_reddit_id or "root"
                children_dict[parent_id].append(comment)

            # Build tree recursively
            self._build_tree_recursive(root, children_dict, "root")

            self.stats["created"] += 1

    def _build_tree_recursive(self, parent_node, children_dict, parent_id):
        """Recursively build tree structure"""
        if parent_id not in children_dict:
            return

        # Get children sorted by score (descending)
        children = sorted(
            children_dict[parent_id],
            key=lambda c: (c.score if c.score is not None else 0, c.created),
            reverse=True,
        )

        for comment in children:
            # Add child node
            child_node = parent_node.add_child(
                post=comment.post,
                comment=comment,
                score=comment.score if comment.score is not None else 0,
                created=comment.created,
            )

            # Recursively add grandchildren
            self._build_tree_recursive(child_node, children_dict, comment.reddit_id)
