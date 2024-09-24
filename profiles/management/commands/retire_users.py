"""Management command for retiring users"""
from functools import reduce
import operator
import sys

from django.core.management import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Q
from tabulate import tabulate

from search import search_index_helpers


User = get_user_model()


def spammer_bios():
    """Get the list of spammer bios"""
    with open("profiles/management/commands/data/spammer_bios.txt", "r") as f:
        yield from f.read().splitlines()


class Command(BaseCommand):
    """Retire a user"""

    help = "Retire a user"

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--user-id", help="the id of the user")
        group.add_argument("--email", help="the email of the user")
        group.add_argument("--username", help="the username of the user")
        group.add_argument(
            "--spammers",
            action="store_true",
            default=False,
            help="retire spammer accounts",
        )

    def retire_user(self, user):
        """Retire an individual user"""
        self.stdout.write("Retiring user: {}".format(user))
        self.stdout.write(
            "    Setting user inactive, clearing email, and setting unusable password"
        )
        user.email = ""
        user.is_active = False
        user.set_unusable_password()
        user.save()

        self.stdout.write(
            "    Deleting {} social auths".format(user.social_auth.count())
        )
        user.social_auth.all().delete()

        self.stdout.write(
            "    Deleting {} channel invitations".format(
                user.received_invitations.count()
            )
        )
        user.received_invitations.all().delete()

        search_index_helpers.deindex_profile(user)

        self.stdout.write(
            "    Deleting {} post/comment subscriptions".format(
                user.content_subscriptions.count()
            )
        )
        user.content_subscriptions.all().delete()

    def handle(self, *args, **options):
        """Run retire a user"""
        users = User.objects.none()

        if options["user_id"]:
            users = User.objects.filter(id=options["user_id"])
        elif options["username"]:
            users = User.objects.filter(username=options["username"])
        elif options["email"]:
            users = User.objects.filter(email=options["email"])
        elif options["spammers"]:
            users = User.objects.filter(
                reduce(
                    operator.or_,
                    (Q(profile__bio__icontains=bio) for bio in spammer_bios()),
                )
            )

        users = users.filter(is_active=True)

        if not users:
            self.stdout.write("No users found")
            sys.exit(1)

        self.stdout.write("Users to delete:")
        self.stdout.write(
            tabulate(
                [
                    [
                        user.id,
                        user.username,
                        user.email,
                        user.profile.name if hasattr(user, "profile") else "???",
                    ]
                    for user in users
                ],
                headers=["id", "username", "email", "name"],
            )
        )

        if input("Continue? (y/n): ").lower() != "y":
            return

        for user in users:
            self.retire_user(user)
