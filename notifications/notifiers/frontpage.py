"""Notifier for frontpage digest (deprecated - discussions removed)"""
from notifications.notifiers.email import EmailNotifier


class FrontpageDigestNotifier(EmailNotifier):
    """
    Notifier for frontpage digest emails (deprecated - discussions removed)
    """

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
