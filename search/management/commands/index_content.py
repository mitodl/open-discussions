"""Management command to index reddit content"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Indexes reddit content"""
    help = 'Add content to elasticsearch index'

    def handle(self, *args, **options):
        """TBD: replace with something"""
