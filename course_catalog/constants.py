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
    csail = "CSAIL"
    mitpe = "Professional Education"
    see = "Sloan Executive Education"
    scc = "Schwarzman College of Computing"
    ctl = "Center for Transportation & Logistics"


class PlatformType(Enum):
    """
    Enum for platforms
    """

    ocw = "ocw"
    mitx = "mitx"
    mitxonline = "mitxonline"
    micromasters = "micromasters"
    bootcamps = "bootcamps"
    xpro = "xpro"
    oll = "oll"
    youtube = "youtube"
    podcast = "podcast"
    csail = "csail"
    mitpe = "mitpe"
    see = "see"
    scc = "scc"
    ctl = "ctl"


EDX_PLATFORMS = [
    platform.value
    for platform in (
        PlatformType.mitx,
        PlatformType.mitxonline,
        PlatformType.xpro,
        PlatformType.oll,
    )
]

RESOURCE_FILE_PLATFORMS = [PlatformType.ocw.value, *EDX_PLATFORMS]


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


class UserListType(Enum):
    """
    Enum for UserLists. User-created lists that are not Learning Paths are displayed
    to the user as "Your Lists"
    """

    LEARNING_PATH = "learningpath"
    LIST = "userlist"


class StaffListType(Enum):
    """
    Enum for StaffList objects; sorted = staffpath, unsorted = stafflist
    """

    PATH = "path"
    LIST = "list"


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
    OfferedBy.csail.value: PlatformType.csail.value,
    OfferedBy.ctl.value: PlatformType.ctl.value,
    OfferedBy.mitpe.value: PlatformType.mitpe.value,
    OfferedBy.scc.value: PlatformType.scc.value,
    OfferedBy.see.value: PlatformType.see.value,
}

semester_mapping = {"1T": "spring", "2T": "summer", "3T": "fall"}

VALID_TEXT_FILE_TYPES = [
    ".csv",
    ".doc",
    ".docx",
    ".htm",
    ".html",
    ".json",
    ".m",
    ".mat",
    ".md",
    ".pdf",
    ".ppt",
    ".pptx",
    ".ps",
    ".py",
    ".r",
    ".rtf",
    ".sjson",
    ".srt",
    ".txt",
    ".vtt",
    ".xls",
    ".xlsx",
    ".xml",
]


CONTENT_TYPE_PAGE = "page"
CONTENT_TYPE_FILE = "file"
CONTENT_TYPE_VIDEO = "video"
CONTENT_TYPE_PDF = "pdf"

CONTENT_TYPE_VERTICAL = "vertical"
VALID_COURSE_CONTENT_TYPES = (
    CONTENT_TYPE_PAGE,
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VERTICAL,
)
VALID_COURSE_CONTENT_CHOICES = list(
    zip(VALID_COURSE_CONTENT_TYPES, VALID_COURSE_CONTENT_TYPES)
)

OCW_DEPARTMENTS = {
    "1": {
        "slug": "civil-and-environmental-engineering",
        "name": "Civil and Environmental Engineering",
    },
    "2": {"slug": "mechanical-engineering", "name": "Mechanical Engineering"},
    "3": {
        "slug": "materials-science-and-engineering",
        "name": "Materials Science and Engineering",
    },
    "4": {"slug": "architecture", "name": "Architecture"},
    "5": {"slug": "chemistry", "name": "Chemistry"},
    "6": {
        "slug": "electrical-engineering-and-computer-science",
        "name": "Electrical Engineering and Computer Science",
    },
    "7": {"slug": "biology", "name": "Biology"},
    "8": {"slug": "physics", "name": "Physics"},
    "9": {
        "slug": "brain-and-cognitive-sciences",
        "name": "Brain and Cognitive Sciences",
    },
    "10": {"slug": "chemical-engineering", "name": "Chemical Engineering"},
    "11": {"slug": "urban-studies-and-planning", "name": "Urban Studies and Planning"},
    "12": {
        "slug": "earth-atmospheric-and-planetary-sciences",
        "name": "Earth, Atmospheric, and Planetary Sciences",
    },
    "14": {"slug": "economics", "name": "Economics"},
    "15": {"slug": "sloan-school-of-management", "name": "Sloan School of Management"},
    "16": {
        "slug": "aeronautics-and-astronautics",
        "name": "Aeronautics and Astronautics",
    },
    "17": {"slug": "political-science", "name": "Political Science"},
    "18": {"slug": "mathematics", "name": "Mathematics"},
    "20": {"slug": "biological-engineering", "name": "Biological Engineering"},
    "21A": {"slug": "anthropology", "name": "Anthropology"},
    "21G": {
        "slug": "global-studies-and-languages",
        "name": "Global Studies and Languages",
    },
    "21H": {"slug": "history", "name": "History"},
    "21L": {"slug": "literature", "name": "Literature"},
    "21M": {"slug": "music-and-theater-arts", "name": "Music and Theater Arts"},
    "22": {"slug": "nuclear-engineering", "name": "Nuclear Science and Engineering"},
    "24": {"slug": "linguistics-and-philosophy", "name": "Linguistics and Philosophy"},
    "CC": {"slug": "concourse", "name": "Concourse"},
    "CMS-W": {
        "slug": "comparative-media-studies-writing",
        "name": "Comparative Media Studies/Writing",
    },
    "EC": {"slug": "edgerton-center", "name": "Edgerton Center"},
    "ES": {"slug": "experimental-study-group", "name": "Experimental Study Group"},
    "ESD": {
        "slug": "engineering-systems-division",
        "name": "Engineering Systems Division",
    },
    "HST": {
        "slug": "health-sciences-and-technology",
        "name": "Health Sciences and Technology",
    },
    "IDS": {
        "slug": "institute-for-data-systems-and-society",
        "name": "Institute for Data, Systems, and Society",
    },
    "MAS": {"slug": "media-arts-and-sciences", "name": "Media Arts and Sciences"},
    "PE": {
        "slug": "athletics-physical-education-and-recreation",
        "name": "Athletics, Physical Education and Recreation",
    },
    "SP": {"slug": "special-programs", "name": "Special Programs"},
    "STS": {
        "slug": "science-technology-and-society",
        "name": "Science, Technology, and Society",
    },
    "WGS": {"slug": "womens-and-gender-studies", "name": "Women's and Gender Studies"},
}

GROUP_STAFF_LISTS_EDITORS = "staff_list_editors"
