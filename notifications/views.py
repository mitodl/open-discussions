"""Notification views"""
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.mixins import (
    ListModelMixin,
    UpdateModelMixin,
    RetrieveModelMixin,
)
from rest_framework.viewsets import GenericViewSet

from notifications.serializers import NotificationSettingsSerializer
from open_discussions.authentication import StatelessTokenAuthentication, IgnoreExpiredJwtAuthentication


class NotificationSettingsViewSet(ListModelMixin, UpdateModelMixin, RetrieveModelMixin, GenericViewSet):
    """View for notification settings"""
    serializer_class = NotificationSettingsSerializer
    authentication_classes = (
        IgnoreExpiredJwtAuthentication,
        SessionAuthentication,
        StatelessTokenAuthentication,
    )
    permission_classes = (IsAuthenticated,)
    lookup_field = 'notification_type'

    def get_queryset(self):
        """Gets the QuerySet for this view"""
        user = self.request.user
        return user.notification_settings
