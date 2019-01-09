"""Channel invitations views"""
from rest_framework import viewsets

from channels.models import Channel, ChannelInvitation
from channels.serializers.invites import ChannelInvitationSerializer


class ChannelInvitationViewSet(viewsets.ModelViewSet):
    """Viewset for channel invitations"""

    serializer_class = ChannelInvitationSerializer

    def get_queryset(self):
        """Get the quertset for the view"""
        return ChannelInvitation.objects.filter(
            channel__name=self.kwargs["channel_name"]
        )

    def get_serializer_context(self):
        """Returns the context for the serializer"""
        return {
            "channel": Channel.objects.get(name=self.kwargs["channel_name"]),
            "inviter": self.request.user,
        }
