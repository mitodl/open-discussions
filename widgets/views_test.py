# pylint: disable=redefined-outer-name
"""Views tests"""
from django.shortcuts import reverse
from guardian.shortcuts import assign_perm
import pytest
from rest_framework import status

from widgets.factories import WidgetInstanceFactory, WidgetListFactory
from widgets.models import WidgetInstance

pytestmark = [pytest.mark.django_db]

EXPECTED_AVAILABLE_WIDGETS = [
    {
        "form_spec": [
            {
                "field_name": "source",
                "input_type": "markdown_wysiwyg",
                "label": "Text",
                "props": {"placeholder": "Enter widget text"},
                "default": "",
            }
        ],
        "widget_type": "Markdown",
        "description": "Rich Text",
    },
    {
        "form_spec": [
            {
                "field_name": "url",
                "input_type": "url",
                "label": "URL",
                "props": {
                    "max_length": "",
                    "min_length": "",
                    "placeholder": "Enter URL",
                    "show_embed": True,
                },
                "default": "",
            }
        ],
        "widget_type": "URL",
        "description": "Embedded URL",
    },
    {
        "form_spec": [
            {
                "field_name": "url",
                "input_type": "url",
                "label": "URL",
                "props": {
                    "max_length": "",
                    "min_length": "",
                    "placeholder": "RSS feed URL",
                    "show_embed": False,
                },
                "default": "",
            },
            {
                "field_name": "feed_display_limit",
                "input_type": "number",
                "label": "Max number of items",
                "props": {"max": 10, "min": 1},
                "default": 5,
            },
        ],
        "widget_type": "RSS Feed",
        "description": "RSS Feed",
    },
]


@pytest.fixture
def widget_list(disable_search_tasks, user):  # pylint: disable=unused-argument
    """Creates a widget list the user can write to"""
    widget_list = WidgetListFactory.create()
    assign_perm("change_widgetlist", user, widget_list)
    return widget_list


def test_widget_list_get(client, widget_list):
    """Tests that you can get an existing list"""
    url = reverse("widget_list-detail", kwargs={"pk": widget_list.id})
    resp = client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "id": widget_list.id,
        "widgets": [],
        "available_widgets": EXPECTED_AVAILABLE_WIDGETS,
    }


def test_widget_list_add_widget(widget_list, user_client):
    """Tests that you can add a widget to an existing list"""
    url = reverse("widget_list-detail", kwargs={"pk": widget_list.id})
    resp = user_client.patch(
        url,
        {
            "widgets": [
                {
                    "widget_type": "Markdown",
                    "title": "Welcome",
                    "configuration": {"source": "# Markdown content"},
                }
            ]
        },
    )

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "id": widget_list.id,
        "widgets": [
            {
                "id": WidgetInstance.objects.first().id,
                "widget_type": "Markdown",
                "title": "Welcome",
                "configuration": {"source": "# Markdown content"},
                "json": None,
            }
        ],
        "available_widgets": EXPECTED_AVAILABLE_WIDGETS,
    }


def test_widget_list_update_widget(widget_list, user_client):
    """Tests that you can add a widget to an existing list"""
    widget_instance = WidgetInstanceFactory.create(widget_list=widget_list)
    url = reverse("widget_list-detail", kwargs={"pk": widget_list.id})
    resp = user_client.patch(
        url,
        {
            "widgets": [
                {
                    "id": widget_instance.id,
                    "widget_type": "Markdown",
                    "title": "Welcome",
                    "configuration": {"source": "# Markdown content"},
                    "json": None,
                }
            ]
        },
    )

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "id": widget_list.id,
        "widgets": [
            {
                "id": WidgetInstance.objects.first().id,
                "widget_type": "Markdown",
                "title": "Welcome",
                "configuration": {"source": "# Markdown content"},
                "json": None,
            }
        ],
        "available_widgets": EXPECTED_AVAILABLE_WIDGETS,
    }


def test_widget_list_add_update_and_reorder_widgets(widget_list, user_client):
    """Tests that you can simultaneously update, reorder, and add a widget"""
    widget_instance = WidgetInstanceFactory.create(widget_list=widget_list)
    url = reverse("widget_list-detail", kwargs={"pk": widget_list.id})
    resp = user_client.patch(
        url,
        {
            "widgets": [
                {
                    "widget_type": "Markdown",
                    "title": "Welcome 2",
                    "configuration": {"source": "# Markdown content 2"},
                    "json": None,
                },
                {
                    "id": widget_instance.id,
                    "widget_type": "Markdown",
                    "title": "Welcome",
                    "configuration": {"source": "# Markdown content"},
                    "json": None,
                },
            ]
        },
    )

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "id": widget_list.id,
        "widgets": [
            {
                "id": WidgetInstance.objects.order_by("id").last().id,
                "widget_type": "Markdown",
                "title": "Welcome 2",
                "configuration": {"source": "# Markdown content 2"},
                "json": None,
            },
            {
                "id": widget_instance.id,
                "widget_type": "Markdown",
                "title": "Welcome",
                "configuration": {"source": "# Markdown content"},
                "json": None,
            },
        ],
        "available_widgets": EXPECTED_AVAILABLE_WIDGETS,
    }
