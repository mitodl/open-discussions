"""Factories for widgets"""
import factory
from factory.django import DjangoModelFactory

from open_discussions.factories import UserFactory
from widgets.models import WidgetInstance, WidgetList


class WidgetListFactory(DjangoModelFactory):
    """Factory for widget lists"""

    class Meta:
        model = WidgetList


class WidgetInstanceFactory(DjangoModelFactory):
    """Factory for widget lists"""

    widget_list = factory.SubFactory(WidgetListFactory)
    widget_type = "Text"
    position = factory.LazyAttribute(lambda inst: inst.widget_list.widgets.count() + 1)
    configuration = factory.LazyAttribute(
        lambda inst: {"body": "example%s" % inst.position}
    )
    title = factory.Faker("text", max_nb_chars=200)

    class Meta:
        model = WidgetInstance

    class Params:
        type_text = factory.Trait(
            widget_type="Text", title="Text Widget", configuration={"body": "example"}
        )
        type_url = factory.Trait(
            widget_type="URL",
            title="URL Widget",
            configuration={"url": "http://example.com"},
        )
        type_markdown = factory.Trait(
            widget_type="Markdown",
            title="Markdown Widget",
            configuration={"source": "*Here's some basic markdown*"},
        )
        type_rss = factory.Trait(
            widget_type="RSS Feed",
            title="RSS Widget",
            configuration={"url": "http://example.com", "feed_display_limit": 10},
        )
        type_people = factory.Trait(
            widget_type="People",
            title="People Widget",
            configuration=factory.LazyAttribute(
                lambda _: {
                    "title": "",
                    "people": [UserFactory.create().username for _ in range(10)],
                    "show_all_members_link": False,
                }
            ),
        )
