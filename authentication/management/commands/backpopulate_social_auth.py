"""Command to populate UserSocialAuth for micromasters"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import OuterRef, Exists
from social_django.models import UserSocialAuth

from authentication import api
from authentication.backends.micromasters import MicroMastersAuth


class Command(BaseCommand):
    """Populates UserSocialAuth"""
    help = 'Populates UserSocialAuth'

    def handle(self, *args, **options):
        micromasters_auths = UserSocialAuth.objects.filter(
            provider=MicroMastersAuth.name,
            user=OuterRef("pk"),
        )
        users = get_user_model().objects.annotate(
            has_mm_auth=Exists(micromasters_auths)
        ).filter(has_mm_auth=False)

        for user in users.iterator():
            api.create_micromasters_social_auth(user)
