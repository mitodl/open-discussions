"""utils for dealing with channel tests"""
from functools import partialmethod
import contextlib
import warnings
import requests


@contextlib.contextmanager
def no_ssl_verification():
    """totally disable SSL verification, useful for Betamax tests"""
    old_request = requests.Session.request
    requests.Session.request = partialmethod(old_request, verify=False)

    warnings.filterwarnings('ignore', 'Unverified HTTPS request')
    yield
    warnings.resetwarnings()

    requests.Session.request = old_request
