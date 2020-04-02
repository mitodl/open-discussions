"""Discussions views"""
from rest_framework.mixins import (
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
)
from rest_framework.permissions import (
    DjangoObjectPermissions,
    IsAdminUser,
    IsAuthenticated,
)
from rest_framework.viewsets import GenericViewSet

from discussions.models import Channel
from discussions.permissions import ChannelIsReadableByAnyUser
from discussions.serializers import ChannelSerializer, CreateChannelSerializer
from open_discussions.pagination import DefaultPagination
from open_discussions.permissions import IsReadOnly


class ChannelViewSet(
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
    GenericViewSet,
):
    """
    ViewSet for channels

    Only supports create, read, and update operations.
    Delete operations intentionally excluded for now since it's not
    supported on the reddit side.
    """

    permission_classes = [
        # if the user is staff, they can do anything
        IsAdminUser
        # if they're anonymous, readonly access is allow for viewable channels
        | (IsReadOnly & ChannelIsReadableByAnyUser)
        # otherwise they need to correct permissions for the individual object
        # this is augmented by ObjectPermissionsFilter in filter_backends to ensure
        # resources are projected on a per-operation basis for GET requests on the collection
        | (IsAuthenticated & DjangoObjectPermissions)
    ]

    pagination_class = DefaultPagination

    def get_queryset(self):
        """Returns the base queryset"""
        return Channel.objects.filter_for_user(self.request.user)

    def get_serializer_class(self):
        """Get the serializer class for this request"""
        if self.request.method == "POST":
            return CreateChannelSerializer
        else:
            return ChannelSerializer
