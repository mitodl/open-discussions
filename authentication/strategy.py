"""Custom strategy"""
from social_django.strategy import DjangoStrategy

from authentication import api as auth_api


class OpenDiscussionsStrategy(DjangoStrategy):
    """A custom strategy for open"""

    def create_user(self, *args, **kwargs):
        """Creates the user during the pipeline execution"""
        # this is normally delegated to the storage mechanism,
        # specifically social_django.storage.DjangoUserMixin.create_user
        # but we want to call our own method to create the user so we override at the strategy level
        username = kwargs.pop("username")
        email = kwargs.pop("email")
        return auth_api.create_user(username, email, user_extra=kwargs)


class DjangoRestFrameworkStrategy(OpenDiscussionsStrategy):
    """Strategy specific to handling DRF requests"""

    def __init__(self, storage, drf_request=None, tpl=None):
        self.drf_request = drf_request
        # pass the original django request to DjangoStrategy
        request = drf_request._request  # pylint: disable=protected-access
        super().__init__(storage, request=request, tpl=tpl)

    def request_data(self, merge=True):
        """Returns the request data"""
        if not self.drf_request:
            return {}

        # DRF stores json payload data here, not in request.POST or request.GET like PSA expects
        return self.drf_request.data
