"""Backend for micromasters JWT token auth"""

from open_discussions.backends.base_jwt import BaseJwtAuth


class MicroMastersAuth(BaseJwtAuth):
    """Authentication backend for MicroMasters JWT"""
    name = 'micromasters'
    REQUIRES_EMAIL_VALIDATION = False

    def auth_url(self):
        """Returns the url to authenticate the user at"""
        return self.setting('LOGIN_URL')
