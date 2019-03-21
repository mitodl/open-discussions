"""Tests for people widget serializer"""
import pytest

from profiles.serializers import ProfileSerializer
from profiles.models import Profile
from widgets.factories import WidgetInstanceFactory
from widgets.serializers import people


pytestmark = pytest.mark.django_db


def test_people_widget_serialize(mocker):
    """Tests that the people widget serializes correctly"""
    # ugly mock hack to avoid the index_new_profile.delay() call in Profile.save() of the comment author
    mocker.patch("search.task_helpers.index_new_profile")

    widget_instance = WidgetInstanceFactory.create(type_people=True)
    data = people.PeopleWidgetSerializer(widget_instance).data
    profiles = [
        Profile.objects.get(user__username=username)
        for username in widget_instance.configuration["people"]
    ]

    assert data == {
        "id": widget_instance.id,
        "widget_type": "People",
        "title": widget_instance.title,
        "configuration": widget_instance.configuration,
        "json": {
            "people": [ProfileSerializer(profile).data for profile in profiles],
            "show_all_members_link": widget_instance.configuration[
                "show_all_members_link"
            ],
        },
    }
