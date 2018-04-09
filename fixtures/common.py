"""Common config for pytest and friends"""
# pylint: disable=unused-argument, redefined-outer-name
import warnings

import factory
import pytest


@pytest.fixture(autouse=True)
def warnings_as_errors():
    """
    Convert warnings to errors. This should only affect unit tests, letting pylint and other plugins
    raise DeprecationWarnings without erroring.
    """
    try:
        warnings.resetwarnings()
        warnings.simplefilter('error')
        # For celery
        warnings.simplefilter('ignore', category=ImportWarning)
        warnings.filterwarnings(
            "ignore",
            message="'async' and 'await' will become reserved keywords in Python 3.7",
            category=DeprecationWarning,
        )
        # Ignore deprecation warnings in third party libraries
        warnings.filterwarnings(
            "ignore",
            module=".*(api_jwt|api_jws|rest_framework_jwt|betamax).*",
            category=DeprecationWarning,
        )

        yield
    finally:
        warnings.resetwarnings()


@pytest.fixture(scope="function")
def randomness():
    """Ensure a fixed seed for factoryboy"""
    factory.fuzzy.reseed_random("happy little clouds")
