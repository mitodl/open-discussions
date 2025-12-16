"""Notification views"""
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.authentication import SessionAuthentication
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import GenericViewSet

from notifications.models import NOTIFICATION_TYPE_COMMENTS, NOTIFICATION_TYPE_FRONTPAGE
from notifications.serializers import NotificationSettingsSerializer
from open_discussions.authentication import (
    IgnoreExpiredJwtAuthentication,
    StatelessTokenAuthentication,
)


class NotificationSettingsViewSet(
    ListModelMixin, UpdateModelMixin, RetrieveModelMixin, GenericViewSet
):
    """View for notification settings"""

    serializer_class = NotificationSettingsSerializer
    authentication_classes = (
        IgnoreExpiredJwtAuthentication,
        SessionAuthentication,
        StatelessTokenAuthentication,
    )
    permission_classes = (IsAuthenticated,)
    lookup_field = "notification_type"

    def get_queryset(self):
        """Gets the QuerySet for this view"""
        user = self.request.user

        return user.notification_settings.filter(
            Q(
                notification_type__in=[
                    NOTIFICATION_TYPE_FRONTPAGE,
                    NOTIFICATION_TYPE_COMMENTS,
                ]
            )
            | Q(channel__moderator_notifications=True)
        )

    def get_object(self):
        queryset = self.get_queryset()

        queryset_filter = {}
        queryset_filter["notification_type"] = self.kwargs["notification_type"]

        if "channel_name" in self.request.data:
            queryset_filter["channel__name"] = self.request.data["channel_name"]

        obj = get_object_or_404(queryset, **queryset_filter)
        return obj
