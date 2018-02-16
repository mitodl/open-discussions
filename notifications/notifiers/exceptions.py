"""Notifier exceptions"""


class NotifierException(Exception):
    """Exception sending notification"""


class InvalidTriggerFrequencyError(NotifierException):
    """The trigger frequency is invalid"""


class UnsupportedNotificationTypeError(NotifierException):
    """The notification type was invalid"""


class MissingNotificationDataError(NotifierException):
    """Required data was missing"""
