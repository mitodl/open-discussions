"""Email validation APIs"""
from contextlib import contextmanager
from csv import DictWriter
from dataclasses import dataclass, field
import json
import logging
import os
import tempfile
import typing
from urllib.parse import urljoin
from zipfile import ZipFile

from anymail.utils import get_anymail_setting
from django.db import transaction
import requests

from authentication.models import EmailValidation
from open_discussions.utils import chunks


log = logging.getLogger()

# the mailgun limit is 25MB, but we set a lower limit
# so that we don't have to count bytes before writing
#                   MB => kB  => B
MAX_CSV_FILE_SIZE = 24 * 1000 * 1000
VALIDATION_API_URL = "https://api.mailgun.net/v4/address/validate/bulk/"


@dataclass
class CsvBatchFile:
    """Dataclass for a CSV batch"""
    name: str
    file: typing.TextIO
    writer: DictWriter
    start_position: int = field(init=False)

    def __post_init__(self):
        """Set the start position after init"""
        self.start_position = self.file.tell()

    def has_data(self) -> bool:
        """Return true if data has been written"""
        return self.file.tell() > self.start_position

    def is_full(self) -> bool:
        """Return true if the size of the file is at or past the limit"""
        return self.file.tell() > MAX_CSV_FILE_SIZE


@contextmanager
def csv_batch_file(name: str):
    """
    Get a temporary file and CSV writer

    Args:
        name(str): the name of the operation/upload

    Returns:
        CsvBatchFile: the batch and associated state and files
    """
    with tempfile.NamedTemporaryFile(
        prefix=name, suffix=".csv", mode="w", delete=False
    ) as file:
        writer = DictWriter(file, fieldnames=["email"])
        writer.writeheader()

        yield CsvBatchFile(name, file, writer)


def get_api_key():
    """Return the Mailgun API key from the Anymail settings"""
    return get_anymail_setting("API_KEY", esp_name="MAILGUN")


def send_to_mailgun(csv_batch):
    """
    Send the CSV file to mailgun

    """
    with open(csv_batch.file.name, "r") as csv_file:
        # send the temporary file up to mailgun
        resp = requests.post(
            urljoin(VALIDATION_API_URL, csv_batch.name),
            auth=("api", get_api_key()),
            files={"file": ("file", csv_file.read())},
            timeout=60*5,
        )
        resp.raise_for_status()


def batch_validation_csv_files(
    users,
    list_name_base: str,
    *,
    db_chunk_size: int = 1000,
    upload_batch_size: int = 5000,
):
    """
    Yields CSV files to upload to mailgun
    """

    # create the iterator here so it can be reused across while loop steps
    user_chunks_iter = chunks(users.only("email"), chunk_size=db_chunk_size)

    batch_idx = 1
    while True:
        with csv_batch_file(f"{list_name_base}-{batch_idx}") as csv_batch:
            # this transaction will mainly get rolled back if there's an error within the yield
            with transaction.atomic():
                batch_size = 0
                for chunk in user_chunks_iter:
                    csv_batch.writer.writerows(
                        [{"email": user.email} for user in chunk]
                    )

                    EmailValidation.objects.bulk_create(
                        [
                            EmailValidation(
                                user=user, email=user.email, list_name=csv_batch.name
                            )
                            for user in chunk
                        ]
                    )

                    batch_size += len(chunk)

                    if csv_batch.is_full() or batch_size >= upload_batch_size:
                        break

                if not csv_batch.has_data():
                    return

                # ensure everything is flushed to disk before we yield
                csv_batch.file.flush()

                yield csv_batch

        batch_idx += 1


def start_user_email_validation(
    users,
    list_name_base: str,
    *,
    db_chunk_size: int = 1000,
    upload_batch_size: int = 20000,
):
    """
    Start the bulk verification of users' email addresses.

    Args:
        users: QuerySet of users to verify
        chunk_size(int): chunk size to write to the temporary CSV file
    """
    for csv_batch in batch_validation_csv_files(
        users,
        list_name_base,
        db_chunk_size=db_chunk_size,
        upload_batch_size=upload_batch_size,
    ):
        send_to_mailgun(csv_batch)


def get_validation_result(list_name: str) -> dict:
    """Get the results for a list validation"""
    resp = requests.get(
        urljoin(VALIDATION_API_URL, list_name),
        auth=("api", get_api_key()),
        timeout=60*5,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_result_zip_file(url: str, temp_dir: str) -> str:
    """Fetch the result file and write it out locally"""
    filename = os.path.join(temp_dir, "results.json.zip")

    with requests.get(url, stream=True) as resp:
        resp.raise_for_status()
        with open(filename, mode="wb") as zip_file:
            for chunk in resp.iter_content(chunk_size=8192):
                zip_file.write(chunk)
    return filename


def unzip_result_file(zip_filename: str, temp_dir: str):
    """Extract the singular result file(s)"""
    with ZipFile(zip_filename, mode="r") as zip_file:
        # there's only 1 file in the zip
        for result_file in zip_file.namelist():
            zip_file.extract(result_file, path=temp_dir)

            yield os.path.join(temp_dir, result_file)


def process_result_file(path: str):
    """Process a results JSON file"""
    with open(path, "r") as f:
        results = json.loads(f.read())

    log.info("Processing %s results from %s", len(results), path)

    for result in results:
        email = result["address"]

        validation_result = result["result"]

        validations = EmailValidation.objects.filter(email=email)

        for validation in validations:
            validation.result = validation_result
            validation.save()

        if validation_result in ("undeliverable", "do_not_send"):
            for validation in validations:
                user = validation.user
                user.is_active = False
                user.save()


def process_validation_results(url: str):
    """Download and process the result file"""
    temp_dir = tempfile.mkdtemp()

    zip_filename = fetch_result_zip_file(url, temp_dir)

    for result_file in unzip_result_file(zip_filename, temp_dir):
        process_result_file(result_file)
