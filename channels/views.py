"""Views for REST APIs for channels"""

from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)

from channels.api import Api
from channels.serializers import (
    ChannelSerializer,
)


class ChannelListView(ListCreateAPIView):
    """
    View for listing and creating channels
    """
    serializer_class = ChannelSerializer
    authentication_classes = ()  # Disabling authentication due to proof of concept
    permission_classes = ()  # Disabling permissions due to proof of concept

    def get_queryset(self):
        """Get generator for channels list"""
        api = Api()
        api.user = True  # Workaround authentication for proof of concept
        return api.list_channels()


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """
    serializer_class = ChannelSerializer
    authentication_classes = ()  # Disabling authentication due to proof of concept
    permission_classes = ()  # Disabling permissions due to proof of concept

    def get_object(self):
        """Get channel referenced by API"""
        api = Api()
        api.user = True
        return api.get_channel(self.kwargs['channel_name'])
