"""Factory utils"""
import faker

from open_discussions.utils import now_in_utc

FAKE = faker.Factory.create()


def channel_name(channel, index):  # pylint: disable=unused-argument
    """Generate a channel name from the current time and a random word"""
    now = now_in_utc().timestamp()
    return "{}_{}_{}".format(int(now), index, FAKE.word())[
        :21
    ]  # maximum of 21-char channel names
