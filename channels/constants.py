"""Constants for channels"""
from enum import Enum, auto

CHANNEL_TYPE_PUBLIC = 'public'
CHANNEL_TYPE_RESTRICTED = 'restricted'
CHANNEL_TYPE_PRIVATE = 'private'

VALID_CHANNEL_TYPES = (
    CHANNEL_TYPE_PRIVATE,
    CHANNEL_TYPE_PUBLIC,
    CHANNEL_TYPE_RESTRICTED,
)

LINK_TYPE_ANY = 'any'
LINK_TYPE_LINK = 'link'
LINK_TYPE_SELF = 'self'

VALID_LINK_TYPES = (
    LINK_TYPE_ANY,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
)

POSTS_SORT_HOT = 'hot'
POSTS_SORT_TOP = 'top'
POSTS_SORT_NEW = 'new'

VALID_POST_SORT_TYPES = (
    POSTS_SORT_HOT,
    POSTS_SORT_TOP,
    POSTS_SORT_NEW,
)

COMMENTS_SORT_BEST = 'best'
COMMENTS_SORT_NEW = 'new'
COMMENTS_SORT_OLD = 'old'

VALID_COMMENT_SORT_TYPES = (
    COMMENTS_SORT_BEST,
    COMMENTS_SORT_NEW,
    COMMENTS_SORT_OLD,
)

POST_TYPE = 'post'
COMMENT_TYPE = 'comment'


class VoteActions(Enum):
    """An enum indicating the valid vote actions that can be taken for a post or comment"""
    UPVOTE = auto()
    DOWNVOTE = auto()
    CLEAR_UPVOTE = auto()
    CLEAR_DOWNVOTE = auto()
