"""Views for REST APIs for channels"""
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.models import Channel, ChannelSubscription
from channels.serializers import SubscriberSerializer
from open_discussions.permissions import (
    IsStaffOrReadonlyPermission,
    IsStaffModeratorOrReadonlyPermission,
)


class SubscriberListView(ListCreateAPIView):
    """
    View to add subscribers in channels
    """

    permission_classes = (IsAuthenticated, IsStaffModeratorOrReadonlyPermission)
    serializer_class = SubscriberSerializer

    def get_serializer_context(self):
        """Context for the request and view"""
        return {"channel_api": self.request.channel_api, "view": self}

    def get_queryset(self):
        """Get generator for subscribers in channel"""
        return (
            subscriber
            for subscriber in list(
                Channel.objects.get(name=self.kwargs["channel_name"]).subscribers
            )
            if subscriber.username != settings.INDEXING_API_USERNAME
        )


class SubscriberDetailView(APIView):
    """
    View to retrieve and remove subscribers in channels
    """

    permission_classes = (IsAuthenticated, IsStaffOrReadonlyPermission)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {"channel_api": self.request.channel_api, "view": self}

    def get(self, request, *args, **kwargs):
        """Get subscriber for the channel"""
        subscriber_name = self.kwargs["subscriber_name"]
        channel_name = self.kwargs["channel_name"]
        subscription = ChannelSubscription.objects.filter(
            channel__name=channel_name, user__username=subscriber_name
        ).first()

        if not subscription:
            raise NotFound(
                "User {} is not a subscriber of {}".format(
                    subscriber_name, channel_name
                )
            )
        return Response(SubscriberSerializer(subscription.user).data)

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a subscriber from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs["channel_name"]
        subscriber_name = self.kwargs["subscriber_name"]

        api.remove_subscriber(subscriber_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
