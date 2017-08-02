"""Functions reading and parsing environment variables"""
import os

from django.core.exceptions import ImproperlyConfigured


class EnvironmentVariableParseException(ImproperlyConfigured):
    """Environment variable was not parsed correctly"""


def get_string(name, default):
    """
    Get an environment variable as a string.

    Args:
        name (str): An environment variable name
        default (str): The default value to use if the environment variable doesn't exist.

    Returns:
        str:
            The environment variable value, or the default
    """
    return os.environ.get(name, default)


def get_bool(name, default):
    """
    Get an environment variable as a boolean.

    Args:
        name (str): An environment variable name
        default (bool): The default value to use if the environment variable doesn't exist.

    Returns:
        bool:
            The environment variable value parsed as a bool
    """
    value = os.environ.get(name)
    if value is None:
        return default

    parsed_value = value.lower()
    if parsed_value == 'true':
        return True
    elif parsed_value == 'false':
        return False

    raise EnvironmentVariableParseException("Expected value in {name}={value} to be a boolean".format(
        name=name,
        value=value,
    ))


def get_int(name, default):
    """
    Get an environment variable as an int.

    Args:
        name (str): An environment variable name
        default (int): The default value to use if the environment variable doesn't exist.

    Returns:
        int:
            The environment variable value parsed as an int
    """
    value = os.environ.get(name)
    if value is None:
        return default

    try:
        parsed_value = int(value)
    except ValueError as ex:
        raise EnvironmentVariableParseException("Expected value in {name}={value} to be an int".format(
            name=name,
            value=value,
        )) from ex

    return parsed_value


def get_any(name, default):
    """
    Get an environment variable as a bool, int, or a string.

    Args:
        name (str): An environment variable name
        default (any): The default value to use if the environment variable doesn't exist.

    Returns:
        any:
            The environment variable value parsed as a bool, int, or a string
    """
    try:
        return get_bool(name, default)
    except EnvironmentVariableParseException:
        try:
            return get_int(name, default)
        except EnvironmentVariableParseException:
            return get_string(name, default)
