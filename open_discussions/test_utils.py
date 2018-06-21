"""Testing utils"""
import abc
from contextlib import contextmanager
import traceback

import pytest


def any_instance_of(*cls):
    """
    Returns a type that evaluates __eq__ in isinstance terms

    Args:
        cls (list of types): variable list of types to ensure equality against

    Returns:
        AnyInstanceOf: dynamic class type with the desired equality
    """
    class AnyInstanceOf(metaclass=abc.ABCMeta):
        """Dynamic class type for __eq__ in terms of isinstance"""
        def __eq__(self, other):
            return isinstance(other, cls)
    for c in cls:
        AnyInstanceOf.register(c)
    return AnyInstanceOf()


@contextmanager
def assert_not_raises():
    """Used to assert that the context does not raise an exception"""
    try:
        yield
    except AssertionError:
        raise
    except Exception:  # pylint: disable=broad-except
        pytest.fail(f'An exception was not raised: {traceback.format_exc()}')


class MockResponse:
    """
    Mock requests.Response
    """
    def __init__(self, content, status_code):
        self.content = content
        self.status_code = status_code
