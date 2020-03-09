"""Management command for uploading master json data for OCW courses"""
from django.core.management import BaseCommand

from course_catalog.etl.deduplication import generate_duplicates_yaml


class Command(BaseCommand):
    """Print course duplicates yaml"""

    help = "Print course duplicates yaml"

    def handle(self, *args, **options):
        self.stdout.write(generate_duplicates_yaml())
