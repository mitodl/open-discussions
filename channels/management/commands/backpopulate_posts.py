"""Management command for populating posts and comments from reddit"""
import sys

import base36
from django.core.management import BaseCommand

from channels import tasks


class Command(BaseCommand):
    """Populate posts and comments from reddit"""

    help = "Populate posts and comments from reddit"

    def add_arguments(self, parser):
        parser.add_argument("--post", nargs="?", action="append")

    def handle(self, *args, **options):
        """Populate posts and comments from reddit"""

        if options["post"]:
            task = tasks.populate_posts_and_comments.delay(
                [base36.loads(post_id) for post_id in options["post"]]
            )
        else:
            task = tasks.populate_all_posts_and_comments.delay()

        self.stdout.write(
            "Started celery task {task} to backpopulate posts and comments".format(
                task=task
            )
        )
        self.stdout.write("Waiting on task...")
        results = task.get()
        # Results will look like this:
        # results = {
        #     'posts': 1734,
        #     'comments': 3547,
        #     "failures": [
        #         {"thing_type": "comment", "thing_id": "c4", "reason": "errors happen"},
        #         {"thing_type": "post", "thing_id": "b9i", "reason": "more than you want them to"}
        #     ]
        # }
        self.stdout.write("Successes:")
        self.stdout.write(f"Posts:       {results['posts']}")
        self.stdout.write(f"Comments:    {results['comments']}")
        failures = results["failures"]
        if failures:
            self.stdout.write("")
            self.stdout.write("Failures:")
            self.stdout.write("thing_type   thing_id   reason")
            for failure in results["failures"]:
                self.stdout.write(
                    f"{failure['thing_type']:<12} {failure['thing_id']:<10} {failure['reason']}"
                )
            sys.exit(1)
