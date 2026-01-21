"""People widget serializer"""
from profiles.models import Profile
from profiles.serializers import ProfileSerializer
from widgets.serializers.react_fields import ReactCheckboxField, ReactPeopleField
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)


class PeopleWidgetSerializerConfigSerializer(WidgetConfigSerializer):
    """Serializer for PeopleWidgetSerializer config"""

    people = ReactPeopleField(
        help_text="Enter widget text", label="Add members to widget", default=[]
    )
    show_all_members_link = ReactCheckboxField(default=False)


class PeopleWidgetSerializer(WidgetInstanceSerializer):
    """Widget class for displaying people"""

    configuration_serializer_class = PeopleWidgetSerializerConfigSerializer

    name = "People"
    description = "People"

    def get_json(self, instance):
        """Look up information about users and provide a mapping"""
        usernames = instance.configuration["people"]

        profiles = Profile.objects.filter(user__username__in=usernames)
        lookup = {profile.user.username: profile for profile in profiles}

        return {
            "people": [
                ProfileSerializer(lookup[username]).data for username in usernames
            ],
            "show_all_members_link": instance.configuration.get(
                "show_all_members_link", False
            ),
        }
