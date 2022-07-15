"""Channel app"""
from django.apps import AppConfig


class ChannelsConfig(AppConfig):
    """Channels AppConfig"""

    name = "channels"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import channels.signals  # pylint: disable=unused-import
