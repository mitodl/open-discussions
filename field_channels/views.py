"""Views for field_channels"""
from django.contrib.auth.models import User, Group
from django.db.models import OuterRef
from guardian.shortcuts import get_groups_with_perms
from rest_framework import mixins, viewsets
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.views import APIView
from rest_framework_extensions.mixins import NestedViewSetMixin

from course_catalog.views import LargePagination
from field_channels.constants import FIELD_ROLE_MODERATORS
from field_channels.models import FieldChannel, Subfield, SubfieldList, FieldChannelGroupRole
from field_channels.permissions import HasFieldPermission, FieldModeratorPermissions
from field_channels.serializers import FieldChannelSerializer, SubFieldSerializer, SubFieldListSerializer, \
    FieldModeratorSerializer
from field_channels.utils import get_group_role_name
from open_discussions.permissions import IsStaffPermission


class FieldChannelViewSet(
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
    permission_classes = (HasFieldPermission,)
    lookup_field = "name"

    def get_queryset(self):
        """Return a queryset"""
        return FieldChannel.objects.all()


class SubFieldViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,):
    """
    Viewset for Subfields
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


class FieldModeratorListView(ListCreateAPIView):
    """
    View for listing and adding moderators
    """

    permission_classes = (FieldModeratorPermissions,)
    serializer_class = FieldModeratorSerializer

    def get_queryset(self):
        """
        Builds a queryset of relevant users with permissions for this website, and annotates them by group name/role
        (owner, administrator, editor, or global administrator)
        """
        field_group_name = get_group_role_name(
            FieldChannel.objects.get(name=self.kwargs["field_name"]),
            FIELD_ROLE_MODERATORS
        )

        return User.objects.filter(groups__name=field_group_name)


class FieldModeratorDetailView(APIView):
    """
    View to retrieve and remove field moderators
    """

    permission_classes = (FieldModeratorPermissions,)
    serializer_class = FieldModeratorSerializer

    def delete(self, request, *args, **kwargs):
        """ Remove the user from the moderator groups for this website """
        user = User.objects.get(username=self.kwargs["moderator_name"])
        group_role = Group.objects.get(name=get_group_role_name(
            self.kwargs["field_name"],
            FIELD_ROLE_MODERATORS
        ))
        user.groups.remove(group_role)
        return Response(status=HTTP_204_NO_CONTENT)
