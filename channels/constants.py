"""Constants for channels"""

CHANNEL_TYPE_PUBLIC = 'public'
CHANNEL_TYPE_PRIVATE = 'private'

VALID_CHANNEL_TYPES = (
    CHANNEL_TYPE_PRIVATE,
    CHANNEL_TYPE_PUBLIC,
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
