"""Moira lists app"""
from django.apps import AppConfig


class MoiraListsConfig(AppConfig):
    """MoiraLists AppConfig"""

    name = "moira_lists"

    # write the moira x509 certification & key to files
    from moira_lists.utils import write_x509_files

    write_x509_files()
