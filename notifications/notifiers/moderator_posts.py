"""Notifier for moderator posts (deprecated - discussions removed)"""
from notifications.notifiers.email import EmailNotifier


class ModeratorPostsNotifier(EmailNotifier):
    """Notifier for moderator post emails (deprecated - discussions removed)"""

    def should_send_notification(self):
        """Returns False - moderator notifications disabled

        Returns:
            bool: False

        """
        return False

    def get_base_context(self):
        """Get the template context for the moderator notification

        Returns:
            dict: empty dict

        """
        return {}

    def get_template_name(self):
        """Get the template name for the moderator notification

        Returns:
            str: template name

        """
        return "moderator_post_email"

    def create_moderator_post_event(self, user, post_id):
        """Creates a moderator post event (deprecated - no-op)

        Args:
            user (User): the user
            post_id (str): base36 post id

        """
