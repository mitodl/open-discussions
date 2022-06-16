"""Views for channels_fields"""
from django.contrib.auth.models import User
from rest_framework import mixins, viewsets
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.views import APIView

from channels_fields.api import get_group_role_name, remove_user_role
from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.models import FieldChannel
from channels_fields.permissions import FieldModeratorPermissions, HasFieldPermission
from channels_fields.serializers import FieldChannelSerializer, FieldModeratorSerializer
from course_catalog.views import LargePagination


class FieldChannelViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Viewset for Field Channels
    """

    serializer_class = FieldChannelSerializer
    pagination_class = LargePagination
    permission_classes = (HasFieldPermission,)
    lookup_field = "name"
    lookup_url_kwarg = "field_name"

    def get_queryset(self):
        """Return a queryset"""
        return FieldChannel.objects.all()

    def delete(self, request, *args, **kwargs):
        """ Remove the user from the moderator groups for this field channel """
        FieldChannel.objects.get_object_or_404(name=kwargs["field_name"]).delete()
        return Response(status=HTTP_204_NO_CONTENT)


class FieldModeratorListView(ListCreateAPIView):
    """
    View for listing and adding moderators
    """

    permission_classes = (FieldModeratorPermissions,)
    serializer_class = FieldModeratorSerializer

    def get_queryset(self):
        """
        Builds a queryset of relevant users with moderator permissions for this field channel
        """
        field_group_name = get_group_role_name(
            FieldChannel.objects.get(name=self.kwargs["field_name"]),
            FIELD_ROLE_MODERATORS,
        )

        return User.objects.filter(groups__name=field_group_name)


class FieldModeratorDetailView(APIView):
    """
    View to retrieve and remove field channel moderators
    """

    permission_classes = (FieldModeratorPermissions,)
    serializer_class = FieldModeratorSerializer

    def delete(self, request, *args, **kwargs):
        """ Remove the user from the moderator groups for this website """
        user = User.objects.get(username=self.kwargs["moderator_name"])
        field_name = self.kwargs["field_name"]
        remove_user_role(
            FieldChannel.objects.get(name=field_name), FIELD_ROLE_MODERATORS, user
        )
        return Response(status=HTTP_204_NO_CONTENT)
