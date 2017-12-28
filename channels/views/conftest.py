"""Configure common fixtures for views tests"""
# pylint: disable=redefined-outer-name,unused-argument
import pytest
from betamax.fixtures.pytest import _casette_name

from channels.api import Api, CHANNEL_TYPE_PRIVATE
from channels.factories import RedditFactories, FactoryStore


@pytest.fixture()
def reddit_factories(request, cassette_exists):
    """RedditFactories fixture"""
    # use betamax's _casette_name to determine filename
    store = FactoryStore(_casette_name(request, parametrized=True))
    ctx = RedditFactories(store)
    if cassette_exists:
        store.load()
    yield ctx
    if not cassette_exists:
        store.write()


@pytest.fixture()
def user(db, reddit_factories):
    """Override the user fixture to use reddit_factories"""
    return reddit_factories.user("contributor")


@pytest.fixture()
def staff_user(db, reddit_factories):
    """Override the staff_user fixture to use reddit_factories"""
    return reddit_factories.user("staff_user")


@pytest.fixture()
def private_channel(reddit_factories, staff_user):
    """Returns a standard channel for tests"""
    return reddit_factories.channel("private_channel", staff_user, channel_type=CHANNEL_TYPE_PRIVATE)


@pytest.fixture()
def staff_api(staff_user):
    """A fixture for an Api instance configured with the staff user"""
    return Api(staff_user)


@pytest.fixture()
def private_channel_and_contributor(private_channel, staff_api, user):
    """Fixture for a channel and a user who is a contributor"""
    staff_api.add_contributor(user.username, private_channel.name)
    staff_api.add_subscriber(user.username, private_channel.name)
    return (private_channel, user)
