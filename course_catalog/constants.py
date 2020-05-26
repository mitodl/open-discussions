"""
course_catalog constants
"""
from enum import Enum


class OfferedBy(Enum):
    """
    Enum for our Offered By labels. They are our MIT "brands" for LearningResources
    (Courses, Bootcamps, Programs) and are independent of what platform.
    User generated lists UserLists (like a learning path) don't have offered by "brand".
    Values are user-facing.
    """

    mitx = "MITx"
    ocw = "OCW"
    micromasters = "MicroMasters"
    bootcamps = "Bootcamps"
    xpro = "xPRO"
    oll = "Open Learning Library"
    see = "Sloan Executive Education"
    mitpe = "Professional Education"
    csail = "CSAIL"


class PlatformType(Enum):
    """
    Enum for platforms
    """

    ocw = "ocw"
    mitx = "mitx"
    micromasters = "micromasters"
    bootcamps = "bootcamps"
    xpro = "xpro"
    oll = "oll"
    youtube = "youtube"
    see = "see"
    mitpe = "mitpe"
    podcast = "podcast"
    csail = "csail"


class ResourceType(Enum):
    """
    Enum for resource types (for OCW and MitX)
    """

    course = "course"
    ocw_resource = "ocw_resource"


class AvailabilityType(Enum):
    """
    Enum for Course availability options dictated by edX API values.
    While these are the options coming in from edX that we store as is, we
    display some values differently. Namely "Current" is displayed to the user
    as "Available Now" and "Archived" is displayed as "Prior".
    As of 06/21/2019, the above mapping occurs in `learning_resources.js:availabilityLabel()`.
    All OCW courses should be set to "Current".
    """

    current = "Current"  # displayed as "Available Now"
    upcoming = "Upcoming"
    starting_soon = "Starting Soon"
    archived = "Archived"  # displayed as "Prior"


class ListType(Enum):
    """
    Enum for UserLists. User-created lists that are not Learning Paths are displayed
    to the user as "Your Lists"
    """

    LEARNING_PATH = "learningpath"
    LIST = "userlist"


class PrivacyLevel(Enum):
    """
    Enum tracking privacy levels for user-created UserLists
    """

    private = "private"
    shared = "shared"
    public = "public"


MIT_OWNER_KEYS = ["MITx", "MITx_PRO"]

NON_COURSE_DIRECTORIES = [
    "PROD/biology",
    "PROD/chemistry",
    "PROD/engineering",
    "PROD/humanities-and-social-sciences",
    "PROD/iit-jee",
    "PROD/mathematics",
    "PROD/more",
    "PROD/physics",
    "QA",
]

OFFERED_BY_MAPPINGS = {
    OfferedBy.micromasters.value: PlatformType.mitx.value,
    OfferedBy.mitx.value: PlatformType.mitx.value,
    OfferedBy.ocw.value: PlatformType.ocw.value,
    OfferedBy.oll.value: PlatformType.oll.value,
    OfferedBy.xpro.value: PlatformType.xpro.value,
    OfferedBy.bootcamps.value: PlatformType.bootcamps.value,
}

semester_mapping = {"1T": "spring", "2T": "summer", "3T": "fall"}

mitpe_edx_mapping = {
    "Biotechnology & Pharmaceutical": ["Biological Engineering"],
    "Computer Science": ["Computer Science"],
    "Crisis Management": ["Management"],
    "Data Modeling & Analytics": ["Computer Science"],
    "Design & Manufacturing": ["Systems Engineering"],
    "Energy & Sustainability": ["Energy", "Earth Science"],
    "Imaging": ["Computer Science", "Electrical Engineering"],
    "Innovation": ["Innovation"],
    "Leadership & Communication": ["Leadership", "Communication"],
    "Radar": ["Electrical Engineering"],
    "Real Estate": ["Real Estate"],
    "Systems Engineering": ["Systems Engineering"],
}

see_edx_mapping = {
    "Business Analytics": ["Management"],
    "Digital Business & IT": ["Management", "Information Technology"],
    "Entrepreneurship": ["Entrepreneurship"],
    "Family Enterprise": ["Management"],
    "Financial Management": ["Management", "Finance"],
    "Global Economics & Markets": ["Economics", "Globalization"],
    "Marketing": ["Marketing"],
    "Negotiation & Communication": ["Management", "Leadership", "Business Ethics"],
    "Operations": ["Operations Management"],
    "Organizations & Leadership": ["Organizational Behavior", "Leadership"],
    "Strategy & Innovation": ["Innovation"],
    "Systems Thinking": ["Management"],
    "Business & Management": ["Management"],
}

VALID_TEXT_FILE_TYPES = [
    ".pdf",
    ".htm",
    ".html",
    ".txt",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".xml",
    ".json",
    ".rtf",
    ".ps",
]


CONTENT_TYPE_PAGE = "page"
CONTENT_TYPE_FILE = "file"
CONTENT_TYPE_VERTICAL = "vertical"
VALID_COURSE_CONTENT_TYPES = (
    CONTENT_TYPE_PAGE,
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VERTICAL,
)
VALID_COURSE_CONTENT_CHOICES = list(
    zip(VALID_COURSE_CONTENT_TYPES, VALID_COURSE_CONTENT_TYPES)
)
