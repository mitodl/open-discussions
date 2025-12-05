"""Base class for Reddit export commands"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from channels.api import get_admin_api

logger = logging.getLogger(__name__)


class BaseRedditExportCommand(BaseCommand):
    """Base class with common export functionality"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.api = None
        self.export_timestamp = None
        self.stats = {
            "processed": 0,
            "created": 0,
            "updated": 0,
            "errors": 0,
            "skipped": 0,
        }

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true", help="Run without making changes"
        )
        parser.add_argument(
            "--batch-size", type=int, default=100, help="Batch size for bulk operations"
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit number of items to process (for testing)",
        )

    def setup(self, options):
        """Initialize API and timestamp"""
        self.api = get_admin_api()
        self.export_timestamp = timezone.now()
        self.dry_run = options["dry_run"]
        self.batch_size = options["batch_size"]
        self.limit = options["limit"]

        if self.dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN MODE - No changes will be made")
            )

    def log_progress(self, message, level="info"):
        """Log progress with stats"""
        stats_str = f"Processed: {self.stats['processed']}, Created: {self.stats['created']}, Errors: {self.stats['errors']}"
        full_message = f"{message} | {stats_str}"

        if level == "success":
            self.stdout.write(self.style.SUCCESS(full_message))
        elif level == "error":
            self.stdout.write(self.style.ERROR(full_message))
        elif level == "warning":
            self.stdout.write(self.style.WARNING(full_message))
        else:
            self.stdout.write(full_message)

    def log_final_stats(self):
        """Log final statistics"""
        self.stdout.write(self.style.SUCCESS("\n=== Final Statistics ==="))
        for key, value in self.stats.items():
            self.stdout.write(f"{key.capitalize()}: {value}")
