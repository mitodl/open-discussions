"""Notifier for frontpage digest (deprecated - discussions removed)"""
from notifications.notifiers.email import EmailNotifier


class FrontpageDigestNotifier(EmailNotifier):
    """
    Notifier for frontpage digest emails (deprecated - discussions removed)
    """

    def __init__(self, notification_settings):
        """
        Initialize the notifier with notification settings

        Args:
            notification_settings: NotificationSettings instance
        """
        super().__init__("frontpage_email", notification_settings)

    def should_send_notification(self):
        """
        Returns False - frontpage notifications disabled

        Returns:
            bool: False
        """
        return False

    def get_base_context(self):
        """
        Get the template context for the frontpage notification

        Returns:
            dict: empty dict
        """
        return {}

    def get_template_name(self):
        """
        Get the template name for the frontpage notification

        Returns:
            str: template name
        """
        return "frontpage_email"
