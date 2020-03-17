"""Moira list tasks"""
import logging
from django.contrib.auth import get_user_model

from channels.membership_api import update_memberships_for_managed_channels
from moira_lists.models import MoiraList
from moira_lists import moira_api
from open_discussions.celery import app

User = get_user_model()
log = logging.getLogger()


@app.task
def update_user_moira_lists(user_id, update_memberships=False):
    """
    Update the user's moira lists

    Args:
        user_id (int): User id
        update_memberships (bool): Whether to update memberships afterward
    """
    moira_api.update_user_moira_lists(User.objects.get(id=user_id))
    if update_memberships:
        update_memberships_for_managed_channels(user_ids=[user_id])


@app.task
def update_moira_list_users(names):
    """
    Update the users for each moira list

    Args:
        names (list of str): Moira list name
    """
    for name in names:
        moira_list, _ = MoiraList.objects.get_or_create(name=name)
        moira_api.update_moira_list_users(moira_list)
