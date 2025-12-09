"""Channel API middleware (deprecated)"""


class ChannelApiMiddleware:
    """
    Middleware that makes a channel API object available to views (deprecated - no-op)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)
