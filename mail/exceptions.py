"""Mail exceptions"""


class SendEmailsException(Exception):
    """
    An exception which occurs when batch processing of email fails. This contains a list of other exceptions and
    the emails which caused the failure.
    """

    def __init__(self, exception_pairs):
        """
        Creates a SendEmailsException
        Args:
            exception_pairs (list): A list of (message, exception)
        """
        super().__init__(exception_pairs)
        self.exception_pairs = exception_pairs

    @property
    def failed_recipient_emails(self):
        """
        Yields a list of recipient emails that we failed to send to
        """
        for message, _ in self.exception_pairs:
            yield from message.to
