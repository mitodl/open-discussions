"""apps for channels_fields"""
from django.apps import AppConfig


class ChannelsFieldsConfig(AppConfig):
    """Config for ChannelsFieldsConfig"""

    name = "channels_fields"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import channels_fields.signals  # pylint: disable=unused-import
