"""Channel API middleware"""
from django.utils.functional import SimpleLazyObject

from channels.api import Api


class ChannelApiMiddleware:
    """
    Middleware that makes a channel API object available to views
    via a lazy object attached to the request
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.channel_api = SimpleLazyObject(lambda: Api(request.user))
        return self.get_response(request)
