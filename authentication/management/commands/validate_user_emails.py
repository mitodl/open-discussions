"""Management command for starting the verification of user emails"""
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand
from django.db.models import Exists, OuterRef

from authentication import email_validation_api
from authentication.models import EmailValidation
import requests


User = get_user_model()


def get_unprocessed_validation_lists():
    """Return a QuerySet for unprocess"""
    return (
        EmailValidation.objects.filter(result__isnull=True)
        .values_list("list_name", flat=True)
        .distinct()
    )


class Command(BaseCommand):
    """Verify user emails"""

    help = "Verify user emails"

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest="subcommand", required=True)
        start_parser = subparsers.add_parser("start")
        start_parser.add_argument(
            "--upload-catch-size",
            dest="upload_batch_size",
            default=5000,
            help="The batch size of the CSVs to upload",
        )
        subparsers.add_parser("check")
        subparsers.add_parser("process")

    def handle(self, *args, **options):
        """Run verify user emails"""
        subcommand = options["subcommand"]
        if subcommand == "start":
            self.handle_start(*args, **options)
        elif subcommand == "check":
            self.handle_check(*args, **options)
        elif subcommand == "process":
            self.handle_process(*args, **options)

    def handle_start(self, *args, **options):
        """Run verify user emails"""
        timestamp = int(datetime.utcnow().timestamp())
        list_name_prefix = f"email-validation-{timestamp}"
        upload_batch_size = options["upload_batch_size"]

        users = User.objects.annotate(
            has_email_validations=Exists(
                EmailValidation.objects.filter(
                    user=OuterRef("pk"), email=OuterRef("email")
                )
            )
        ).filter(has_email_validations=False)

        try:
            email_validation_api.start_user_email_validation(
                users,
                list_name_prefix,
                upload_batch_size=upload_batch_size,
            )
        except requests.exceptions.HTTPError as exc:
            self.stderr.write(str(exc))
            self.stderr.write(exc.response.json())
        except Exception as exc:
            self.stderr.write(str(exc))

    def handle_check(self, *args, **options):
        processed = False
        for list_name in get_unprocessed_validation_lists():
            processed = True
            data = email_validation_api.get_validation_result(list_name)

            self.stdout.write("\n")
            self.stdout.write(f"List: {list_name}")
            self.stdout.write(
                f"Results: {data['records_processed']}/{data['quantity']} processed"
            )
            result = data["summary"]["result"]
            self.stdout.write(f"\t{result['deliverable']} deliverable")
            self.stdout.write(f"\t{result['do_not_send']} do not send")
            self.stdout.write(f"\t{result['undeliverable']} undeliverable")
            self.stdout.write(f"\t{result['catch_all']} catch all")
            self.stdout.write(f"\t{result['unknown']} unknown")

        if not processed:
            self.stdout.write("No results to process")

    def handle_process(self, *args, **options):
        """Process the results and update user records"""
        processed = False
        for list_name in get_unprocessed_validation_lists():
            processed = True

            self.stdout.write("\n")
            self.stdout.write(f"List: {list_name}")

            data = email_validation_api.get_validation_result(list_name)

            download_url = data["download_url"]["json"]

            email_validation_api.process_validation_results(download_url)

        if not processed:
            self.stdout.write("No results to process")
