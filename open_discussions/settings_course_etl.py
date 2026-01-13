"""Django settings specific to course catalog ingestion
"""
from open_discussions.envs import get_bool, get_int, get_string

# EDX API Credentials
EDX_API_URL = get_string("EDX_API_URL", None)
EDX_API_ACCESS_TOKEN_URL = get_string("EDX_API_ACCESS_TOKEN_URL", None)
EDX_API_CLIENT_ID = get_string("EDX_API_CLIENT_ID", None)
EDX_API_CLIENT_SECRET = get_string("EDX_API_CLIENT_SECRET", None)
EDX_LEARNING_COURSE_BUCKET_NAME = get_string("EDX_LEARNING_COURSE_BUCKET_NAME", None)
EDX_LEARNING_COURSE_BUCKET_PREFIX = get_string(
    "EDX_LEARNING_COURSE_BUCKET_PREFIX", "simeon-mitx-course-tarballs"
)
# Authentication for the github api
GITHUB_ACCESS_TOKEN = get_string("GITHUB_ACCESS_TOKEN", None)

# S3 Bucket info for OCW Plone CMS exports
OCW_CONTENT_BUCKET_NAME = get_string("OCW_CONTENT_BUCKET_NAME", None)

# s3 Buckets for OCW Next imports
OCW_NEXT_LIVE_BUCKET = get_string("OCW_NEXT_LIVE_BUCKET", None)
OCW_NEXT_AWS_STORAGE_BUCKET_NAME = get_string("OCW_NEXT_AWS_STORAGE_BUCKET_NAME", None)

# S3 Bucket info for exporting OCW Plone media files
OCW_LEARNING_COURSE_BUCKET_NAME = get_string("OCW_LEARNING_COURSE_BUCKET_NAME", None)
OCW_UPLOAD_IMAGE_ONLY = get_bool("OCW_UPLOAD_IMAGE_ONLY", False)
OCW_ITERATOR_CHUNK_SIZE = get_int("OCW_ITERATOR_CHUNK_SIZE", 1000)
OCW_WEBHOOK_DELAY = get_int("OCW_WEBHOOK_DELAY", 120)
OCW_WEBHOOK_KEY = get_string("OCW_WEBHOOK_KEY", None)
OCW_NEXT_SEARCH_WEBHOOK_KEY = get_string("OCW_NEXT_SEARCH_WEBHOOK_KEY", None)
MAX_S3_GET_ITERATIONS = get_int("MAX_S3_GET_ITERATIONS", 3)
OCW_NEXT_BASE_URL = get_string("OCW_NEXT_BASE_URL", "http://ocw.mit.edu/")

# Base URL's for courses
OCW_BASE_URL = get_string("OCW_BASE_URL", "http://ocw.mit.edu/")
MITX_BASE_URL = get_string("MITX_BASE_URL", "https://www.edx.org/course/")
MITX_ALT_URL = get_string("MITX_ALT_URL", "https://courses.edx.org/courses/")
BLOCKLISTED_COURSES_URL = get_string(
    "BLOCKLISTED_COURSES_URL",
    "https://raw.githubusercontent.com/mitodl/open-resource-blocklists/master/courses.txt",
)
DUPLICATE_COURSES_URL = get_string("DUPLICATE_COURSES_URL", None)

# Base URL for Micromasters data
MICROMASTERS_CATALOG_API_URL = get_string("MICROMASTERS_CATALOG_API_URL", None)

# Base URL for Prolearn data
PROLEARN_CATALOG_API_URL = get_string("PROLEARN_CATALOG_API_URL", None)

# Iterator chunk size for MITx and xPRO courses
LEARNING_COURSE_ITERATOR_CHUNK_SIZE = get_int("LEARNING_COURSE_ITERATOR_CHUNK_SIZE", 20)

# xPRO settings for course/resource ingestion
XPRO_LEARNING_COURSE_BUCKET_NAME = get_string("XPRO_LEARNING_COURSE_BUCKET_NAME", None)
XPRO_CATALOG_API_URL = get_string("XPRO_CATALOG_API_URL", None)
XPRO_COURSES_API_URL = get_string("XPRO_COURSES_API_URL", None)

# MITx Online settings for course/resource ingestion
MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME = get_string(
    "MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME", None
)
MITX_ONLINE_BASE_URL = get_string("MITX_ONLINE_BASE_URL", None)
MITX_ONLINE_PROGRAMS_API_URL = get_string("MITX_ONLINE_PROGRAMS_API_URL", None)
MITX_ONLINE_COURSES_API_URL = get_string("MITX_ONLINE_COURSES_API_URL", None)

# Open Learning Library settings
OLL_API_URL = get_string("OLL_API_URL", None)
OLL_API_ACCESS_TOKEN_URL = get_string("OLL_API_ACCESS_TOKEN_URL", None)
OLL_API_CLIENT_ID = get_string("OLL_API_CLIENT_ID", None)
OLL_API_CLIENT_SECRET = get_string("OLL_API_CLIENT_SECRET", None)
OLL_BASE_URL = get_string("OLL_BASE_URL", None)
OLL_ALT_URL = get_string("OLL_ALT_URL", None)

# More MIT URLs
SEE_BASE_URL = get_string("SEE_BASE_URL", None)
MITPE_BASE_URL = get_string("MITPE_BASE_URL", None)
CSAIL_BASE_URL = get_string("CSAIL_BASE_URL", None)

# course catalog video etl settings
OPEN_VIDEO_DATA_BRANCH = get_string("OPEN_VIDEO_DATA_BRANCH", "master")
OPEN_VIDEO_USER_LIST_OWNER = get_string("OPEN_VIDEO_USER_LIST_OWNER", None)
OPEN_VIDEO_MAX_TOPICS = get_int("OPEN_VIDEO_MAX_TOPICS", 3)
OPEN_VIDEO_MIN_TERM_FREQ = get_int("OPEN_VIDEO_MIN_TERM_FREQ", 1)
OPEN_VIDEO_MIN_DOC_FREQ = get_int("OPEN_VIDEO_MIN_DOC_FREQ", 15)

YOUTUBE_DEVELOPER_KEY = get_string("YOUTUBE_DEVELOPER_KEY", None)
YOUTUBE_FETCH_TRANSCRIPT_SLEEP_SECONDS = get_int(
    "YOUTUBE_FETCH_TRANSCRIPT_SLEEP_SECONDS", 5
)

# course catalog podcast etl settings
OPEN_PODCAST_DATA_BRANCH = get_string("OPEN_PODCAST_DATA_BRANCH", "master")

# Tika security
TIKA_ACCESS_TOKEN = get_string("TIKA_ACCESS_TOKEN", None)
