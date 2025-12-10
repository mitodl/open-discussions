"""Tests for people widget serializer"""
import pytest

from profiles.models import Profile
from profiles.serializers import ProfileSerializer
from widgets.factories import WidgetInstanceFactory
from widgets.serializers import people

pytestmark = pytest.mark.django_db


def test_people_widget_serialize():
    """Tests that the people widget serializes correctly"""
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
