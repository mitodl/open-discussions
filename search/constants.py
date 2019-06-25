""" Constants for search """
from channels.constants import POST_TYPE, COMMENT_TYPE

ALIAS_ALL_INDICES = "all"
PROFILE_TYPE = "profile"
COURSE_TYPE = "course"
BOOTCAMP_TYPE = "bootcamp"
PROGRAM_TYPE = "program"
USER_LIST_TYPE = "user_list"

VALID_OBJECT_TYPES = (
    POST_TYPE,
    COMMENT_TYPE,
    PROFILE_TYPE,
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
)
GLOBAL_DOC_TYPE = "_doc"
