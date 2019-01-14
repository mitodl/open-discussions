"""utils for dealing with channel tests"""
from functools import partialmethod
import contextlib
import warnings
import requests


@contextlib.contextmanager
def no_ssl_verification():
    """totally disable SSL verification, useful for Betamax tests"""
    old_request = requests.Session.request
    try:
        requests.Session.request = partialmethod(old_request, verify=False)

        warnings.filterwarnings("ignore", "Unverified HTTPS request")

        yield
    finally:
        warnings.resetwarnings()

        requests.Session.request = old_request


def assert_properties_eq(obj, expected):
    """
    Asserts that properties on an object are equal to the expected values

    Args:
        obj(object): the object to assert properties on
        expected(dict): key/value mapping of expected properties
    """
    for key, value in expected.items():
        if any(value is const_val for const_val in (None, True, False)):
            assert getattr(obj, key) is value
        else:
            assert getattr(obj, key) == value
