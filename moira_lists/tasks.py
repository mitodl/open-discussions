"""Moira list tasks"""
import logging
from django.contrib.auth import get_user_model

from moira_lists.models import MoiraList
from moira_lists.moira_api import update_user_moira_lists, update_moira_list_users
from open_discussions.celery import app

User = get_user_model()
log = logging.getLogger()


@app.task
def update_user_moira_lists(user_id):
    """
    Update the user's moira lists

    Args:
        user_id (int): User id
    """
    update_user_moira_lists(User.objects.get(id=user_id))


@app.task
def update_moira_list(name):
    """
    Update the users for each moira list

    Args:
        name (str): Moira list name
    """
    moira_list, _ = MoiraList.objects.get_or_create(name=name)
    update_moira_list_users(moira_list)
