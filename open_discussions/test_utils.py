"""Testing utils"""
import abc
import json
from contextlib import contextmanager
import traceback
from unittest.mock import Mock

from django.http.response import HttpResponse

import pytest


def any_instance_of(*classes):
    """
    Returns a type that evaluates __eq__ in isinstance terms

    Args:
        classes (list of types): variable list of types to ensure equality against

    Returns:
        AnyInstanceOf: dynamic class type with the desired equality
    """

    class AnyInstanceOf(abc.ABC):
        """Dynamic class type for __eq__ in terms of isinstance"""

        def __init__(self, classes):
            self.classes = classes

        def __eq__(self, other):
            return isinstance(other, self.classes)

        def __str__(self):  # pragma: no cover
            return f"AnyInstanceOf({', '.join([str(c) for c in self.classes])})"

        def __repr__(self):  # pragma: no cover
            return str(self)

    for c in classes:
        AnyInstanceOf.register(c)
    return AnyInstanceOf(classes)


@contextmanager
def assert_not_raises():
    """Used to assert that the context does not raise an exception"""
    try:
        yield
    except AssertionError:
        raise
    except Exception:  # pylint: disable=broad-except
        pytest.fail(f"An exception was not raised: {traceback.format_exc()}")


class MockResponse(HttpResponse):
    """
    Mocked HTTP response object that can be used as a stand-in for request.Response and
    django.http.response.HttpResponse objects
    """

    def __init__(self, content, status_code):
        """
        Args:
            content (str): The response content
            status_code (int): the response status code
        """
        self.status_code = status_code
        self.decoded_content = content
        super().__init__(content=(content or "").encode("utf-8"), status=status_code)

    def json(self):
        """Return content as json"""
        return json.loads(self.decoded_content)


def drf_datetime(dt):
    """
    Returns a datetime formatted as a DRF DateTimeField formats it

    Args:
        dt(datetime): datetime to format

    Returns:
        str: ISO 8601 formatted datetime
    """
    return dt.isoformat().replace("+00:00", "Z")


def _sort_values_for_testing(obj):
    """
    Sort an object recursively if possible to do so

    Args:
        obj (any): A dict, list, or some other JSON type

    Returns:
        any: A sorted version of the object passed in, or the same object if no sorting can be done
    """
    if isinstance(obj, dict):
        return {key: _sort_values_for_testing(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        items = [_sort_values_for_testing(value) for value in obj]
        # this will produce incorrect results since everything is converted to a string
        # for example [10, 9] will be sorted like that
        # but here we only care that the items are compared in a consistent way so tests pass
        return sorted(items, key=json.dumps)
    else:
        return obj


def assert_json_equal(obj1, obj2, sort=False):
    """
    Asserts that two objects are equal after a round trip through JSON serialization/deserialization.
    Particularly helpful when testing DRF serializers where you may get back OrderedDict and other such objects.

    Args:
        obj1 (object): the first object
        obj2 (object): the second object
        sort (bool): If true, sort items which are iterable before comparing
    """
    converted1 = json.loads(json.dumps(obj1))
    converted2 = json.loads(json.dumps(obj2))
    if sort:
        converted1 = _sort_values_for_testing(converted1)
        converted2 = _sort_values_for_testing(converted2)
    assert converted1 == converted2


class PickleableMock(Mock):
    """
    A Mock that can be passed to pickle.dumps()

    Source: https://github.com/testing-cabal/mock/issues/139#issuecomment-122128815
    """

    def __reduce__(self):
        """Required method for being pickleable"""
        return (Mock, ())
