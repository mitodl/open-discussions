"""Common config for pytest and friends"""
# pylint: disable=unused-argument, redefined-outer-name
import importlib
import warnings
from functools import wraps
from types import SimpleNamespace
from unittest.mock import Mock, patch

import factory
import pytest

import channels.api
import channels.factories
import channels.serializers


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


@pytest.fixture(scope='session', autouse=True)
def session_indexing_decorator():
    """
    Fixture that mocks the reddit object indexer for the test suite by default.

    Decorators require some extra work to patch since they are already applied to functions
    when a module is loaded. To get around this, we patch the decorator function then
    reload the relevant modules via importlib.
    """
    mock_func = Mock()

    def dummy_decorator(**kwargs):  # pylint: disable=unused-argument
        """A decorator that calls a mock before calling the wrapped function"""
        def dummy_decorator_inner(func):  # pylint: disable=missing-docstring
            @wraps(func)
            def wrapped_api_func(*args, **kwargs):  # pylint: disable=missing-docstring
                mock_func(*args, **kwargs)
                return func(*args, **kwargs)
            return wrapped_api_func
        return dummy_decorator_inner

    patched_decorator = patch('search.task_helpers.reddit_object_indexer', dummy_decorator)
    patched_decorator.start()
    # Reload the modules that import and use the channels API. All methods decorated with
    # reddit_object_indexer will now use the simple patched version that was created here.
    importlib.reload(channels.factories)
    importlib.reload(channels.api)
    importlib.reload(channels.serializers)
    yield SimpleNamespace(patch=patched_decorator, mock_indexing_func=mock_func)


@pytest.fixture()
def indexing_decorator(session_indexing_decorator):
    """
    Fixture that resets the indexing function mock and returns the indexing decorator fixture.
    This can be used if there is a need to test whether or not a function is wrapped in the
    indexing decorator.
    """
    session_indexing_decorator.mock_indexing_func.reset_mock()
    yield session_indexing_decorator
