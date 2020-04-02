"""Discussions constants"""
from enum import Enum, Flag, auto


class LowercaseValueEnum(Enum):
    """Mixin for enums that should have lowercased values when using auto()"""

    @staticmethod
    def _generate_next_value_(
        name, start, count, last_values
    ):  # pylint: disable=unused-argument
        """Generate a next value using the lowercased name"""
        return name.lower()


class ChoiceFieldMixin:
    """Choice mixin for enums"""

    @classmethod
    def values(cls):
        """Returns a list of values"""
        return [member.value for member in cls]

    @classmethod
    def choices(cls):
        """Returns a list of choices"""
        return [(member.value, member.name.replace("_", " ").title()) for member in cls]


class ChannelTypes(ChoiceFieldMixin, LowercaseValueEnum):
    """Enum for channel types"""

    PUBLIC = auto()
    PRIVATE = auto()
    RESTRICTED = auto()

    @classmethod
    def readable_by_any_user(cls):
        """Return a list of channel types than can be read by anyone"""
        return [cls.PUBLIC.value, cls.RESTRICTED.value]


class PostTypes(ChoiceFieldMixin, Flag):
    """Enum for channel types"""

    LINK = auto()  # 1
    SELF = auto()  # 2
    ARTICLE = auto()  # 4


class ChannelPerms(ChoiceFieldMixin, LowercaseValueEnum):
    """Enum representing additional permissions for a channel"""

    MODERATE = auto()
    ADD_CONTRIBUTOR = auto()
    ADD_SUBSCRIBER = auto()
    CREATE_POST = auto()


DEFAULT_MODERATOR_PERMS = ChannelPerms.values()

DEFAULT_CONTRIBUTOR_PERMS = [ChannelPerms.CREATE_POST.value]
