"""Management command for retiring users"""
from django.core.management import BaseCommand
from django.contrib.auth import get_user_model

from search import search_index_helpers


User = get_user_model()


class Command(BaseCommand):
    """Retire a user"""

    help = "Retire a user"

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--user-id", help="the id of the user")
        group.add_argument("--email", help="the email of the user")
        group.add_argument("--username", help="the username of the user")

    def handle(self, *args, **options):
        """Run retire a user"""
        if options["user_id"]:
            user = User.objects.get(id=options["user_id"])
        elif options["username"]:
            user = User.objects.get(username=options["username"])
        elif options["email"]:
            user = User.objects.get(email=options["email"])

        self.stdout.write(
            "Setting user inactive, clearing email, and setting unusable password"
        )
        user.email = ""
        user.is_active = False
        user.set_unusable_password()
        user.save()

        self.stdout.write("Deleting {} social auths".format(user.social_auth.count()))
        user.social_auth.all().delete()

        self.stdout.write(
            "Deleting {} channel invitations".format(user.received_invitations.count())
        )
        user.received_invitations.all().delete()

        search_index_helpers.deindex_profile(user)

        self.stdout.write(
            "Deleting {} post/comment subscriptions".format(
                user.content_subscriptions.count()
            )
        )
        user.content_subscriptions.all().delete()

        self.stdout.write("Retired user: {}".format(user))
