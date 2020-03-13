"""Moira list utility functions"""
import os
import re
from collections import namedtuple

from django.conf import settings
from mit_moira import Moira

from channels.exceptions import MoiraException


MoiraUser = namedtuple("MoiraUser", "username type")


def write_to_file(filename, contents):
    """
    Write content to a file in binary mode, creating directories if necessary

    Args:
        filename (str): The full-path filename to write to.
        contents (bytes): What to write to the file.

    """
    if not os.path.exists(os.path.dirname(filename)):
        os.makedirs(os.path.dirname(filename))
    with open(filename, "wb") as infile:
        infile.write(contents)


def write_x509_files():
    """Write the x509 certificate and key to files"""
    write_to_file(settings.MIT_WS_CERTIFICATE_FILE, settings.MIT_WS_CERTIFICATE)
    write_to_file(settings.MIT_WS_PRIVATE_KEY_FILE, settings.MIT_WS_PRIVATE_KEY)


def get_moira_client():
    """
    Gets a moira client.

    Returns:
        Moira: A moira client
    """

    _check_files_exist(
        [settings.MIT_WS_CERTIFICATE_FILE, settings.MIT_WS_PRIVATE_KEY_FILE]
    )
    try:
        return Moira(settings.MIT_WS_CERTIFICATE_FILE, settings.MIT_WS_PRIVATE_KEY_FILE)
    except Exception as exc:  # pylint: disable=broad-except
        raise MoiraException(
            "Something went wrong with creating a moira client"
        ) from exc


def _check_files_exist(paths):
    """Checks that files exist at given paths."""
    errors = []
    for path in paths:
        if not os.path.isfile(path):
            errors.append("File missing: expected path '{}'".format(path))
    if errors:
        raise RuntimeError("\n".join(errors))


def get_moira_user(user):
    """
    Return the most likely username & type (USER, STRING) for a user in moira lists based on email.
    If the email ends with 'mit.edu', assume kerberos id = email prefix
    Otherwise use the entire email address as the username.

    Args:
        user (django.contrib.auth.User): the Django user to return a Moira user for.

    Returns:
        MoiraUser: A namedtuple containing username and type
    """
    if re.search(r"(@|\.)mit.edu$", user.email):
        return MoiraUser(user.email.split("@")[0], "USER")
    return MoiraUser(user.email, "STRING")


def query_moira_lists(user):
    """
    Get a set of all moira lists (including nested lists) a user has access to, by querying the Moira service.

    Args:
        user (django.contrib.auth.User): the Django user.

    Returns:
        list_names(list): A list of names of moira lists which contain the user as a member.
    """
    moira_user = get_moira_user(user)
    moira = get_moira_client()
    try:
        list_infos = moira.user_list_membership(
            moira_user.username, moira_user.type, max_return_count=100_000
        )
        list_names = [list_info["listName"] for list_info in list_infos]
        return list_names
    except Exception as exc:  # pylint: disable=broad-except
        if "java.lang.NullPointerException" in str(exc):
            # User is not a member of any moira lists, so ignore exception and return empty list
            return []
        raise MoiraException(
            "Something went wrong with getting moira-lists for %s" % user.username
        ) from exc


def user_moira_lists(user):
    """
    Get a list of all the moira lists a user has access to

    Args:
        user (django.contrib.auth.User): the Django user.

    Returns:
        list_names(set): An set containing all known lists the user belongs to,
            including ancestors of nested lists.
    """
    if user.is_anonymous:
        return []
    list_names = set(query_moira_lists(user))
    return list_names


def moira_user_emails(member_list):
    """
    Transform a list of moira list members to emails.
    Assumes kerberos id => <kerberos_id>@mit.edu

    Args:
        member_list (list of str): List of members returned by Moira

    Returns:
        list of str: Member emails in list
    """
    return list(map(lambda member: member if "@" in member else f"{member}@mit.edu", member_list))
