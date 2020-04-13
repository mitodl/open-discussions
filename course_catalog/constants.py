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
    xpro = "xPro"
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


ocw_edx_mapping = {
    "Business": ["Business & Management"],
    "Accounting": ["Business & Management"],
    "Business Ethics": ["Ethics"],
    "Entrepreneurship": ["Business & Management"],
    "Finance": ["Economics & Finance"],
    "Globalization": ["Business & Management"],
    "Health Care Management": ["Health & Safety"],
    "Industrial Relations and Human Resource": ["Business & Management"],
    "Information Technology": ["Business & Management"],
    "Innovation": ["Business & Management"],
    "Leadership": ["Business & Management"],
    "Management": ["Business & Management"],
    "Marketing": ["Business & Management"],
    "Operations Management": ["Business & Management"],
    "Organizational Behavior": ["Business & Management"],
    "Project Management": ["Business & Management"],
    "Real Estate": ["Business & Management"],
    "Supply Chain Management": ["Business & Management"],
    "Engineering": ["Engineering"],
    "Aerospace Engineering": ["Engineering"],
    "Aerodynamics": ["Engineering"],
    "Astrodynamics": ["Engineering"],
    "Avionics": ["Engineering"],
    "Bioastronautics": ["Engineering"],
    "Guidance and Control Systems": ["Engineering"],
    "Materials Selection": ["Engineering"],
    "Propulsion Systems": ["Engineering"],
    "Structural Mechanics": ["Engineering"],
    "Biological Engineering": ["Engineering"],
    "Biomaterials": ["Engineering"],
    "Biomechanics": ["Engineering"],
    "Biostatistics": ["Data Analysis & Statistics"],
    "Biotechnology": ["Engineering"],
    "Cell and Tissue Engineering": ["Engineering"],
    "Computational Biology": ["Data Analysis & Statistics"],
    "Synthetic Biology": ["Engineering"],
    "Chemical Engineering": ["Engineering", "Chemistry"],
    "Molecular Engineering": ["Engineering", "Chemistry"],
    "Polymers": ["Engineering", "Chemistry"],
    "Process Control Systems": ["Engineering", "Chemistry"],
    "Separation Processes": ["Engineering", "Chemistry"],
    "Transport Processes": ["Engineering", "Chemistry"],
    "Civil Engineering": ["Engineering"],
    "Construction Management": ["Engineering"],
    "Geotechnical Engineering": ["Engineering"],
    "Structural Engineering": ["Engineering"],
    "Surveying": ["Engineering"],
    "Transportation Engineering": ["Engineering"],
    "Computer Science": ["Computer Science"],
    "Algorithms and Data Structures": ["Computer Science"],
    "Artificial Intelligence": ["Computer Science"],
    "Computer Design and Engineering": ["Computer Science"],
    "Computer Networks": ["Computer Science"],
    "Cryptography": ["Computer Science"],
    "Data Mining": ["Computer Science", "Data Analysis & Statistics"],
    "Graphics and Visualization": ["Computer Science"],
    "Human-Computer Interfaces": ["Computer Science"],
    "Operating Systems": ["Computer Science"],
    "Programming Languages": ["Computer Science"],
    "Software Design and Engineering": ["Computer Science"],
    "Theory of Computation": ["Computer Science"],
    "Electrical Engineering": ["Engineering"],
    "Digital Systems": ["Engineering"],
    "Electric Power": ["Engineering"],
    "Electronics": ["Electronics"],
    "Robotics and Control Systems": ["Engineering"],
    "Signal Processing": ["Engineering"],
    "Telecommunications": ["Engineering"],
    "Environmental Engineering": ["Engineering"],
    "Aquatic Sciences & Water Qual Ctl": ["Engineering"],
    "Environmental Management": ["Environmental Studies"],
    "Hydrodynamics and Coastal Engineering": ["Engineering"],
    "Hydrology and Water Resource Systems": ["Engineering"],
    "Materials Science and Engineering": ["Engineering"],
    "Composite Materials": ["Engineering"],
    "Electronic Materials": ["Engineering"],
    "Metallurgical Engineering": ["Engineering"],
    "Polymeric Materials": ["Engineering"],
    "Mechanical Engineering": ["Engineering"],
    "Dynamics and Control": ["Engineering"],
    "Fluid Mechanics": ["Engineering"],
    "Mechanical Design": ["Engineering"],
    "Microtechnology": ["Engineering"],
    "Solid Mechanics": ["Engineering"],
    "Nanotechnology": ["Engineering"],
    "Nuclear Engineering": ["Engineering"],
    "Nuclear Materials": ["Engineering"],
    "Nuclear Sys, Policy, and Econ": ["Engineering"],
    "Radiological Engineering": ["Engineering"],
    "Ocean Engineering": ["Engineering"],
    "Hydrodynamics": ["Engineering"],
    "Ocean Exploration": ["Engineering"],
    "Ocean Structures": ["Engineering"],
    "Oceanic Pollution Control": ["Environmental Studies"],
    "Systems Engineering": ["Engineering"],
    "Computational Models & Sims": ["Engineering"],
    "Computational Sci & Engineering": ["Engineering"],
    "Numerical Simulation": ["Engineering", "Data Analysis & Statistics"],
    "Systems Design": ["Engineering"],
    "Systems Optimization": ["Engineering"],
    "Fine Arts": ["Art & Culture"],
    "Architecture": ["Architecture"],
    "Architectural Design": ["Architecture"],
    "Architectural Engineering": ["Architecture"],
    "Architectural History and Criticism": ["Architecture"],
    "Environmental Design": ["Architecture", "Environmental Studies"],
    "Religious Architecture": ["Architecture"],
    "Art History": ["History"],
    "Game Design": ["Design"],
    "Media Studies": ["Communication"],
    "Digital Media": ["Communication"],
    "Music": ["Music"],
    "Music History": ["Music"],
    "Music Performance": ["Music"],
    "Music Theory": ["Music"],
    "Performance Arts": ["Art & Culture"],
    "Dance": ["Art & Culture"],
    "Theater": ["Art & Culture"],
    "Theatrical Design": ["Design"],
    "Visual Arts": ["Design"],
    "Film and Video": ["Art & Culture"],
    "Graphic Design": ["Design"],
    "Photography": ["Art & Culture"],
    "Health and Medicine": ["Health & Safety"],
    "Anatomy and Physiology": ["Health & Safety"],
    "Biomedical Enterprise": ["Health & Safety"],
    "Biomedical Instrumentation": ["Health & Safety"],
    "Biomedical Signal and Image Processing": ["Health & Safety"],
    "Biomedicine": ["Health & Safety"],
    "Cancer": ["Health & Safety"],
    "Cellular and Molecular Medicine": ["Health & Safety"],
    "Epidemiology": ["Health & Safety"],
    "Functional Genomics": ["Health & Safety"],
    "Health and Exercise Science": ["Health & Safety", "Food & Nutrition"],
    "Immunology": ["Health & Safety"],
    "Medical Imaging": ["Health & Safety"],
    "Mental Health": ["Health & Safety"],
    "Pathology and Pathophysiology": ["Health & Safety"],
    "Pharmacology and Toxicology": ["Health & Safety"],
    "Physical Education and Recreation": ["Health & Safety"],
    "Public Health": ["Health & Safety"],
    "Sensory-Neural Systems": ["Health & Safety"],
    "Social Medicine": ["Health & Safety"],
    "Spectroscopy": ["Health & Safety"],
    "Speech Pathology": ["Health & Safety"],
    "Humanities": ["Humanities"],
    "History": ["History"],
    "African History": ["History"],
    "American History": ["History"],
    "Ancient History": ["History"],
    "Asian History": ["History"],
    "Comparative History": ["History"],
    "European History": ["History"],
    "Historical Methods": ["History"],
    "Historiography": ["History"],
    "History of Science and Technology": ["History"],
    "Intellectual History": ["History"],
    "Jewish History": ["History"],
    "Latin American History": ["History"],
    "Medieval History": ["History"],
    "Middle Eastern History": ["History"],
    "Military History": ["History"],
    "Modern History": ["History"],
    "World History": ["History"],
    "Language": ["Language"],
    "Chinese": ["Language"],
    "English as a Second Language": ["Language"],
    "French": ["Language"],
    "German": ["Language"],
    "Italian": ["Language"],
    "Japanese": ["Language"],
    "Portuguese": ["Language"],
    "Spanish": ["Language"],
    "Linguistics": ["Language"],
    "Phonology": ["Language"],
    "Semantics": ["Language"],
    "Syntax": ["Language"],
    "Literature": ["Literature"],
    "Academic Writing": ["Communication"],
    "American Literature": ["Literature"],
    "Biography": ["Literature"],
    "Classics": ["Literature"],
    "Comedy": ["Literature"],
    "Comparative Literature": ["Literature"],
    "Creative Writing": ["Communication"],
    "Criticism": ["Literature"],
    "Drama": ["Literature"],
    "Fiction": ["Literature"],
    "International Literature": ["Literature"],
    "Nonfiction Prose": ["Literature"],
    "Periodic Literature": ["Literature"],
    "Poetry": ["Literature"],
    "Rhetoric": ["Communication"],
    "Technical Writing": ["Communication"],
    "Philosophy": ["Philosophy & Ethics"],
    "Epistemology": ["Philosophy & Ethics"],
    "Ethics": ["Philosophy & Ethics"],
    "Logic": ["Philosophy & Ethics"],
    "Metaphysics": ["Philosophy & Ethics"],
    "Philosophy of Language": ["Philosophy & Ethics"],
    "Political Philosophy": ["Philosophy & Ethics"],
    "Religion": ["Philosophy & Ethics"],
    "Mathematics": ["Math"],
    "Algebra and Number Theory": ["Math"],
    "Applied Mathematics": ["Data Analysis & Statistics"],
    "Calculus": ["Math"],
    "Computation": ["Math"],
    "Differential Equations": ["Math"],
    "Discrete Mathematics": ["Math"],
    "Linear Algebra": ["Math"],
    "Mathematical Analysis": ["Math"],
    "Mathematical Logic": ["Math"],
    "Probability and Statistics": ["Data Analysis & Statistics"],
    "Topology and Geometry": ["Math"],
    "Science": ["Science"],
    "Biology": ["Biology & Life Sciences"],
    "Biochemistry": ["Biology & Life Sciences"],
    "Biophysics": ["Biology & Life Sciences", "Physics"],
    "Cell Biology": ["Biology & Life Sciences"],
    "Computation and Systems Biology": [
        "Biology & Life Sciences",
        "Computer Science",
        "Data Analysis & Statistics",
    ],
    "Developmental Biology": ["Biology & Life Sciences"],
    "Ecology": ["Environmental Studies"],
    "Genetics": ["Biology & Life Sciences"],
    "Microbiology": ["Biology & Life Sciences"],
    "Molecular Biology": ["Biology & Life Sciences"],
    "Neurobiology": ["Biology & Life Sciences"],
    "Neuroscience": ["Biology & Life Sciences"],
    "Proteomics": ["Biology & Life Sciences"],
    "Stem Cells": ["Biology & Life Sciences"],
    "Structural Biology": ["Biology & Life Sciences"],
    "Virology": ["Biology & Life Sciences"],
    "Chemistry": ["Chemistry"],
    "Analytical Chemistry": ["Chemistry"],
    "Inorganic Chemistry": ["Chemistry"],
    "Organic Chemistry": ["Chemistry"],
    "Physical Chemistry": ["Chemistry"],
    "Cognitive Science": ["Education & Teacher Training"],
    "Earth Science": ["Environmental Studies"],
    "Atmospheric Science": ["Environmental Studies"],
    "Climate Studies": ["Environmental Studies"],
    "Environmental Science": ["Environmental Studies"],
    "Geobiology": ["Environmental Studies"],
    "Geochemistry": ["Environmental Studies"],
    "Geology": ["Environmental Studies"],
    "Geophysics": ["Environmental Studies"],
    "Oceanography": ["Environmental Studies"],
    "Planetary Science": ["Environmental Studies"],
    "Sustainability": ["Environmental Studies"],
    "Physics": ["Physics"],
    "Astrophysics": ["Physics"],
    "Atomic, Molecular, Optical Physics": ["Physics"],
    "Classical Mechanics": ["Physics"],
    "Condensed Matter Physics": ["Physics"],
    "Electromagnetism": ["Physics"],
    "High Energy Physics": ["Physics"],
    "Nuclear Physics": ["Physics"],
    "Particle Physics": ["Physics"],
    "Quantum Mechanics": ["Physics"],
    "Relativity": ["Physics"],
    "Theoretical Physics": ["Physics"],
    "Thermodynamics": ["Physics"],
    "Social Science": ["Science"],
    "Anthropology": ["Science"],
    "Biological Anthropology": ["Science"],
    "Cultural Anthropology": ["Science"],
    "Ethnography": ["Science"],
    "Social Anthropology": ["Science"],
    "Archaeology": ["History"],
    "Communication": ["Communication"],
    "Economics": ["Economics & Finance"],
    "Developmental Economics": ["Economics & Finance"],
    "Econometrics": ["Economics & Finance", "Data Analysis & Statistics"],
    "Financial Economics": ["Economics & Finance"],
    "Industrial Organization": ["Economics & Finance"],
    "International Development": ["Economics & Finance"],
    "International Economics": ["Economics & Finance"],
    "Labor Economics": ["Economics & Finance"],
    "Macroeconomics": ["Economics & Finance"],
    "Microeconomics": ["Economics & Finance"],
    "Political Economy": ["Economics & Finance"],
    "Public Economics": ["Economics & Finance"],
    "Game Theory": ["Economics & Finance"],
    "Geography": ["Science"],
    "Legal Studies": ["Law"],
    "Political Science": ["Humanities"],
    "American Politics": ["Humanities"],
    "Comparative Politics": ["Humanities"],
    "International Relations": ["Humanities"],
    "Psychology": ["Science"],
    "Public Administration": ["Law"],
    "Environmental Policy": ["Law", "Environmental Studies"],
    "Military Studies": ["Law"],
    "Public Policy": ["Law"],
    "Regional Politics": ["Law"],
    "Science and Technology Policy": ["Law"],
    "Security Studies": ["Law"],
    "Social Welfare": ["Law"],
    "Sociology": ["Science"],
    "Community Development": ["Science"],
    "Social Justice": ["Ethics"],
    "Urban Studies": ["Architecture"],
    "Housing Development": ["Architecture"],
    "Regional Planning": ["Architecture"],
    "Transportation Planning": ["Architecture"],
    "Urban Planning": ["Architecture"],
    "Society": ["Humanities", "History", "Art & Culture"],
    "African-American Studies": ["Humanities", "History", "Art & Culture"],
    "Asian Studies": ["Humanities", "History", "Art & Culture"],
    "European and Russian Studies": ["Humanities", "History", "Art & Culture"],
    "Gender Studies": ["Humanities", "History", "Art & Culture"],
    "Global Poverty": ["Humanities", "History", "Philanthropy"],
    "Indigenous Studies": ["Humanities", "History", "Art & Culture"],
    "Latin and Caribbean Studies": ["Humanities", "History", "Art & Culture"],
    "Middle Eastern Studies": ["Humanities", "History", "Art & Culture"],
    "The Developing World": ["Humanities", "History", "Philanthropy"],
    "Women's Studies": ["Humanities", "History", "Art & Culture"],
    "Teaching and Education": ["Education & Teacher Training"],
    "Curriculum and Teaching": ["Education & Teacher Training"],
    "Education Policy": ["Education & Teacher Training", "Law"],
    "Educational Technology": ["Education & Teacher Training", "Computer Science"],
    "Higher Education": ["Education & Teacher Training"],
}

mitpe_edx_mapping = {
    "Biotechnology & Pharmaceutical": ["Biology & Life Sciences"],
    "Computer Science": ["Computer Science"],
    "Crisis Management": ["Business & Management"],
    "Data Modeling & Analytics": ["Data Analysis & Statistics"],
    "Design & Manufacturing": ["Design"],
    "Energy & Sustainability": ["Energy & Earth Sciences"],
    "Imaging": ["Engineering"],
    "Innovation": ["Business & Management"],
    "Leadership & Communication": ["Communication"],
    "Radar": ["Engineering"],
    "Real Estate": ["Economics & Finance"],
    "Systems Engineering": ["Engineering"],
}

see_edx_mapping = {
    "Business Analytics": ["Business & Management"],
    "Digital Business & IT": ["Business & Management"],
    "Entrepreneurship": ["Entrepreneurship"],
    "Family Enterprise": ["Business & Management"],
    "Financial Management": ["Economics & Finance"],
    "Global Economics & Markets": ["Economics & Finance"],
    "Marketing": ["Business & Management"],
    "Negotiation & Communication": ["Communication"],
    "Operations": ["Business & Management"],
    "Organizations & Leadership": ["Business & Management"],
    "Strategy & Innovation": ["Business & Management"],
    "Systems Thinking": ["Business & Management"],
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
