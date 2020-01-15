"""Base classes for APIs"""


class ChainableApi:
    """Base class for chainable APIs"""

    def _chain(self):
        return self.__class__()


class BaseUserApi(ChainableApi):
    """Base class for an API that is user-centric"""

    def __init__(self):
        self._user = None
        super()

    def _chain(self):
        clone = super()._chain()
        clone._user = self._user
        return clone

    @property
    def user(self):
        return self._user

    def with_user(self, user):
        """sets the user"""
        clone = self._chain()
        clone._user = user
        return clone
