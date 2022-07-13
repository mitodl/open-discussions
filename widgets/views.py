"""Widgets views"""
from rest_framework import mixins
from rest_framework import viewsets

from open_discussions.permissions import ObjectOnlyPermissions, ReadOnly
from widgets.models import WidgetList
from widgets.serializers.widget_list import WidgetListSerializer


class WidgetListViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    """API for managing widget lists"""

    queryset = WidgetList.objects.prefetch_related("widgets").all()
    serializer_class = WidgetListSerializer
    permission_classes = [ReadOnly | ObjectOnlyPermissions]
