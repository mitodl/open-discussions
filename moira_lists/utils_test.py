"""Tests for moira_lists utils"""
from tempfile import NamedTemporaryFile

from moira_lists.utils import write_to_file


def test_write_to_file():
    """Test that write_to_file creates a file with the correct contents"""
    content = b"-----BEGIN CERTIFICATE-----\nMIID5DCCA02gAwIBAgIRTUTVwsj4Vy+l6+XTYjnIQ==\n-----END CERTIFICATE-----"
    with NamedTemporaryFile() as outfile:
        write_to_file(outfile.name, content)
        with open(outfile.name, "rb") as infile:
            assert infile.read() == content
