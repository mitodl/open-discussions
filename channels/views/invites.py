"""Channel invitations views"""
from rest_framework import viewsets

from channels.models import Channel, ChannelInvitation
from channels.serializers.invites import ChannelInvitationSerializer
from open_discussions.permissions import IsStaffOrModeratorPermission


class ChannelInvitationViewSet(viewsets.ModelViewSet):
    """Viewset for channel invitations"""

    serializer_class = ChannelInvitationSerializer
    permission_classes = (IsStaffOrModeratorPermission,)

    def get_queryset(self):
        """Get the quertset for the view"""
        return ChannelInvitation.objects.filter(
            channel__name=self.kwargs["channel_name"]
        ).order_by("-created_on")

    def get_serializer_context(self):
        """Returns the context for the serializer"""
        return {
            "channel": Channel.objects.get(name=self.kwargs["channel_name"]),
            "inviter": self.request.user,
        }
