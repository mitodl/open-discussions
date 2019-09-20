"""Utility functions for ETL processes"""
from functools import wraps
import logging

from toolz import excepts

log = logging.getLogger()


def log_exceptions(msg, *, exc_return_value=None):
    """
    Returns a decorator to log exceptions of the wrapped function

    Args:
        msg (str): message to print to log
        exc_return_value (Any): the return value if an exception occurs

    Returns:
        callable: the decorator function
    """

    def _log_exceptions(func):
        """
        Decorates a function with exception logging

        Args:
            func (callable): function to decorate

        Returns:
            callable: the wrapped function
        """

        @wraps(func)
        def _log_exceptions_wrapper(_):
            """
            Log the exception and return the exc_return_value

            Returns:
                Any: the exc_return_value
            """
            log.exception(msg)
            return exc_return_value

        return excepts(Exception, func, _log_exceptions_wrapper)

    return _log_exceptions
