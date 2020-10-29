"""Reclassify posts/comments as spam or ham"""
from django.core.management.base import BaseCommand

from channels import tasks
from open_discussions.utils import now_in_utc
from open_discussions.constants import CELERY_HIGH_PRIORITY


class Command(BaseCommand):
    """Reclassify posts/comments as spam or ham"""

    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument(
            "--spam",
            dest="is_spam",
            action="store_true",
            help="Mark comments and posts as spam.",
        )

        parser.add_argument(
            "--ham",
            dest="is_ham",
            action="store_true",
            help="Mark comments and posts as ham",
        )

        parser.add_argument(
            "-c",
            "--comment-id",
            dest="comment_ids",
            action="append",
            default=[],
            help="Comment ids to reclassify",
        )
        parser.add_argument(
            "-p",
            "--post-id",
            dest="post_ids",
            action="append",
            default=[],
            help="Post ids to reclassify",
        )
        parser.add_argument(
            "--retire-users",
            dest="retire_users",
            action="store_true",
            default=False,
            help="Retire users",
        )
        parser.add_argument(
            "--skip-akismet",
            dest="skip_akismet",
            action="store_true",
            default=False,
            help="Skip submitting spam/ham reclassification to askimet",
        )

    def handle(self, *args, **options):
        if options["is_spam"]:
            is_spam = True
        elif options["is_ham"]:
            is_spam = False
        else:
            self.stdout.write("Either --spam or --ham flag is required")
            return

        task = tasks.update_spam.apply_async(
            args=[],
            kwargs=dict(
                spam=is_spam,
                comment_ids=options["comment_ids"],
                post_ids=options["post_ids"],
                retire_users=options["retire_users"],
                skip_akismet=options["skip_akismet"],
            ),
            priority=CELERY_HIGH_PRIORITY,
        )

        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write("Updated spam, took {} seconds".format(total_seconds))
