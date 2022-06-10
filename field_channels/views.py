"""Views for field_channels"""
from rest_framework import mixins, viewsets
from rest_framework_extensions.mixins import NestedViewSetMixin

from course_catalog.views import LargePagination
from field_channels.models import FieldChannel, Subfield, SubfieldList
from field_channels.serializers import FieldChannelSerializer, SubFieldSerializer, SubFieldListSerializer
from open_discussions.permissions import IsStaffPermission


class FieldChannelViewSet(
    NestedViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,):
    """
    Viewset for Field Channels
    """

    serializer_class = FieldChannelSerializer
    pagination_class = LargePagination
    permission_classes = (IsStaffPermission,)
    lookup_field = "name"

    def get_queryset(self):
        """Return a queryset"""
        return FieldChannel.objects.all()


class SubFieldViewSet(
    NestedViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,):
    """
    Viewset for Field Channels
    """

    serializer_class = SubFieldSerializer
    pagination_class = LargePagination
    permission_classes = (IsStaffPermission,)
    lookup_field = "name"

    def get_queryset(self):
        """Return a queryset"""
        return Subfield.objects.all()


class SubFieldListViewSet(
    NestedViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,):
    """
    Viewset for FieldLists
    """

    serializer_class = SubFieldListSerializer
    pagination_class = LargePagination
    permission_classes = (IsStaffPermission,)
    lookup_field = "name"

    def get_queryset(self):
        """Return a queryset"""
        parent_lookup_subfield = self.kwargs.get("parent_lookup_subfield")
        queryset = SubfieldList.objects.filter(
            subfield__name=parent_lookup_subfield
        ).select_related("subfield")
        return queryset.order_by("sort_order")
