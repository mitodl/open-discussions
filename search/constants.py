""" Constants for search """
from opensearchpy.exceptions import ConnectionError as ESConnectionError
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException
from urllib3.exceptions import TimeoutError as UrlTimeoutError

from channels.constants import COMMENT_TYPE, POST_TYPE

ALIAS_ALL_INDICES = "all"
PROFILE_TYPE = "profile"
COURSE_TYPE = "course"
RESOURCE_FILE_TYPE = "resourcefile"
PROGRAM_TYPE = "program"
USER_LIST_TYPE = "userlist"
USER_PATH_TYPE = "learningpath"
STAFF_LIST_TYPE = "stafflist"
VIDEO_TYPE = "video"
PODCAST_TYPE = "podcast"
PODCAST_EPISODE_TYPE = "podcastepisode"

LEARNING_RESOURCE_TYPES = (
    COURSE_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    USER_PATH_TYPE,
    STAFF_LIST_TYPE,
    VIDEO_TYPE,
    PODCAST_TYPE,
    PODCAST_EPISODE_TYPE,
    RESOURCE_FILE_TYPE,
)

VALID_OBJECT_TYPES = (
    POST_TYPE,
    COMMENT_TYPE,
    PROFILE_TYPE,
    COURSE_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    STAFF_LIST_TYPE,
    VIDEO_TYPE,
    PODCAST_TYPE,
    PODCAST_EPISODE_TYPE,
)
GLOBAL_DOC_TYPE = "_doc"

OCW_TYPE_ASSIGNMENTS = "Assignments"
OCW_TYPE_EXAMS = "Exams"
OCW_TYPE_LABS = "Labs"
OCW_TYPE_LECTURE_AUDIO = "Lecture Audio"
OCW_TYPE_LECTURE_NOTES = "Lecture Notes"
OCW_TYPE_LECTURE_VIDEOS = "Lecture Videos"
OCW_TYPE_PROJECTS = "Projects"
OCW_TYPE_READINGS = "Readings"
OCW_TYPE_RECITATIONS = "Recitations"
OCW_TYPE_TEXTBOOKS = "Online Textbooks"
OCW_TYPE_TOOLS = "Tools"
OCW_TYPE_TUTORIALS = "Tutorials"
OCW_TYPE_VIDEOS = "Videos"


OCW_SECTION_TYPE_MAPPING = {
    OCW_TYPE_ASSIGNMENTS: OCW_TYPE_ASSIGNMENTS,
    OCW_TYPE_EXAMS: OCW_TYPE_EXAMS,
    OCW_TYPE_LABS: OCW_TYPE_LABS,
    OCW_TYPE_LECTURE_AUDIO: OCW_TYPE_LECTURE_AUDIO,
    OCW_TYPE_LECTURE_NOTES: OCW_TYPE_LECTURE_NOTES,
    OCW_TYPE_LECTURE_VIDEOS: OCW_TYPE_LECTURE_VIDEOS,
    OCW_TYPE_PROJECTS: OCW_TYPE_PROJECTS,
    OCW_TYPE_READINGS: OCW_TYPE_READINGS,
    OCW_TYPE_RECITATIONS: OCW_TYPE_RECITATIONS,
    OCW_TYPE_TEXTBOOKS: OCW_TYPE_TEXTBOOKS,
    OCW_TYPE_TOOLS: OCW_TYPE_TOOLS,
    OCW_TYPE_TUTORIALS: OCW_TYPE_TUTORIALS,
    OCW_TYPE_VIDEOS: OCW_TYPE_VIDEOS,
    "Assignments and Student Work": OCW_TYPE_ASSIGNMENTS,
    "Audio Lectures and Notes": OCW_TYPE_LECTURE_AUDIO,
    "Audio Lectures": OCW_TYPE_LECTURE_AUDIO,
    "Calendar & Assignments": OCW_TYPE_ASSIGNMENTS,
    "Calendar & Readings": OCW_TYPE_READINGS,
    "Calendar and Assignments": OCW_TYPE_ASSIGNMENTS,
    "Calendar and Homework": OCW_TYPE_ASSIGNMENTS,
    "Calendar and Lecture Summaries": OCW_TYPE_LECTURE_NOTES,
    "Calendar and Notes": OCW_TYPE_LECTURE_NOTES,
    "Calendar and Readings": OCW_TYPE_READINGS,
    "Class Slides": OCW_TYPE_LECTURE_NOTES,
    "Conference Videos": OCW_TYPE_VIDEOS,
    "Course Notes": OCW_TYPE_LECTURE_NOTES,
    "Exams & Quizzes": OCW_TYPE_EXAMS,
    "Final Project": OCW_TYPE_PROJECTS,
    "Final Projects": OCW_TYPE_PROJECTS,
    "First Paper Assignment": OCW_TYPE_ASSIGNMENTS,
    "Food Assignment": OCW_TYPE_ASSIGNMENTS,
    "Homework Assignments": OCW_TYPE_ASSIGNMENTS,
    "Labs and Exercises": OCW_TYPE_LABS,
    "Lecture & Recitation Videos": OCW_TYPE_LECTURE_VIDEOS,
    "Lecture and Studio Notes": OCW_TYPE_LECTURE_NOTES,
    "Lecture Audio and Slides": OCW_TYPE_LECTURE_AUDIO,
    "Lecture Handouts": OCW_TYPE_LECTURE_NOTES,
    "Lecture Notes & Slides": OCW_TYPE_LECTURE_NOTES,
    "Lecture Notes and Files": OCW_TYPE_LECTURE_NOTES,
    "Lecture Notes and Handouts": OCW_TYPE_LECTURE_NOTES,
    "Lecture Notes and References": OCW_TYPE_LECTURE_NOTES,
    "Lecture Notes and Slides": OCW_TYPE_LECTURE_NOTES,
    "Lecture Notes and Video": OCW_TYPE_LECTURE_NOTES,
    "Lecture Outlines": OCW_TYPE_LECTURE_NOTES,
    "Lecture Slides and Code": OCW_TYPE_LECTURE_NOTES,
    "Lecture Slides and Files": OCW_TYPE_LECTURE_NOTES,
    "Lecture Slides and Readings": OCW_TYPE_LECTURE_NOTES,
    "Lecture Slides and Supplemental Readings": OCW_TYPE_LECTURE_NOTES,
    "Lecture Slides": OCW_TYPE_LECTURE_NOTES,
    "Lecture slides": OCW_TYPE_LECTURE_NOTES,
    "Lecture Summaries": OCW_TYPE_LECTURE_NOTES,
    "Lecture Videos & Notes": OCW_TYPE_LECTURE_VIDEOS,
    "Lecture Videos & Slides": OCW_TYPE_LECTURE_VIDEOS,
    "Lecture Videos and Class Notes": OCW_TYPE_LECTURE_VIDEOS,
    "Lecture Videos and Notes": OCW_TYPE_LECTURE_VIDEOS,
    "Lecture Videos and Slides": OCW_TYPE_LECTURE_VIDEOS,
    "Lectures: Audio and Slides": OCW_TYPE_LECTURE_AUDIO,
    "Lectures": OCW_TYPE_LECTURE_NOTES,
    "Long Project": OCW_TYPE_PROJECTS,
    "Major Writing Assignments": OCW_TYPE_ASSIGNMENTS,
    "MATLAB Exercises": OCW_TYPE_ASSIGNMENTS,
    "Mini Quizzes": OCW_TYPE_EXAMS,
    "Ongoing Assignments": OCW_TYPE_ASSIGNMENTS,
    "Online Textbook": OCW_TYPE_TEXTBOOKS,
    "Practice Exams": OCW_TYPE_EXAMS,
    "Prior Year Exams": OCW_TYPE_EXAMS,
    "Problem Sets": OCW_TYPE_ASSIGNMENTS,
    "Professional Memorandum Assignments": OCW_TYPE_ASSIGNMENTS,
    "Quiz": OCW_TYPE_EXAMS,
    "Quizzes": OCW_TYPE_EXAMS,
    "Reading Notes": OCW_TYPE_READINGS,
    "Reading, Viewing, and Listening": OCW_TYPE_READINGS,
    "Readings & Films": OCW_TYPE_READINGS,
    "Readings & Listening": OCW_TYPE_READINGS,
    "Readings & Notes": OCW_TYPE_READINGS,
    "Readings and Discussion Schedule": OCW_TYPE_READINGS,
    "Readings and Films Guides": OCW_TYPE_READINGS,
    "Readings and Films": OCW_TYPE_READINGS,
    "Readings and Homework Preparation": OCW_TYPE_READINGS,
    "Readings and Lectures": OCW_TYPE_READINGS,
    "Readings and Listening": OCW_TYPE_READINGS,
    "Readings and Materials": OCW_TYPE_READINGS,
    "Readings and Music": OCW_TYPE_READINGS,
    "Readings and Other Assigned Materials": OCW_TYPE_READINGS,
    "Readings and Viewings": OCW_TYPE_READINGS,
    "Readings Questions": OCW_TYPE_READINGS,
    "Readings, Notes & Slides": OCW_TYPE_READINGS,
    "Recitation Notes": OCW_TYPE_RECITATIONS,
    "Recitation Videos": OCW_TYPE_VIDEOS,
    "Related Video Lectures": OCW_TYPE_LECTURE_VIDEOS,
    "Selected Lecture Notes": OCW_TYPE_LECTURE_NOTES,
    "Student Game Projects": OCW_TYPE_PROJECTS,
    "Student Projects by Year": OCW_TYPE_PROJECTS,
    "Team Projects": OCW_TYPE_PROJECTS,
    "Textbook Contents": OCW_TYPE_TEXTBOOKS,
    "Textbook": OCW_TYPE_TEXTBOOKS,
    "Video Lectures and Slides": OCW_TYPE_LECTURE_VIDEOS,
    "Video Lectures": OCW_TYPE_LECTURE_VIDEOS,
}

SCRIPTING_LANG = "painless"
UPDATE_CONFLICT_SETTING = "proceed"

ENGLISH_TEXT_FIELD = {
    "type": "text",
    "fields": {"english": {"type": "text", "analyzer": "english"}},
}

ENGLISH_TEXT_FIELD_WITH_SUGGEST = {
    "type": "text",
    "fields": {
        "english": {"type": "text", "analyzer": "english"},
        "trigram": {"type": "text", "analyzer": "trigram"},
    },
}

BASE_OBJECT_TYPE = {
    "object_type": {"type": "keyword"},
    "author_id": {"type": "keyword"},
    "author_name": {
        "type": "text",
        "fields": {
            "english": {"type": "text", "analyzer": "english"},
            "trigram": {"type": "text", "analyzer": "trigram"},
            "raw": {"type": "keyword"},
        },
    },
    "author_avatar_small": {"type": "keyword"},
    "author_headline": ENGLISH_TEXT_FIELD,
}

PROFILE_OBJECT_TYPE = {
    **BASE_OBJECT_TYPE,
    "author_bio": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "author_channel_membership": {"type": "keyword"},
    "author_channel_join_data": {
        "type": "nested",
        "properties": {"name": {"type": "keyword"}, "joined": {"type": "date"}},
    },
    "author_avatar_medium": {"type": "keyword"},
    "suggest_field1": {"type": "alias", "path": "author_name.trigram"},
    "suggest_field2": {"type": "alias", "path": "author_bio.trigram"},
}

CONTENT_OBJECT_TYPE = {
    **BASE_OBJECT_TYPE,
    "channel_name": {"type": "keyword"},
    "channel_title": ENGLISH_TEXT_FIELD,
    "channel_type": {"type": "keyword"},
    "text": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "score": {"type": "long"},
    "post_id": {"type": "keyword"},
    "post_title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "post_slug": {"type": "keyword"},
    "created": {"type": "date"},
    "deleted": {"type": "boolean"},
    "removed": {"type": "boolean"},
    "suggest_field1": {"type": "alias", "path": "post_title.trigram"},
    "suggest_field2": {"type": "alias", "path": "text.trigram"},
}


"""
Each resource index needs this relation even if it won't be used,
otherwise no results will be returned from indices without it.
"""
RESOURCE_RELATIONS = {
    "resource_relations": {"type": "join", "relations": {"resource": "resourcefile"}}
}

LEARNING_RESOURCE_TYPE = {
    **RESOURCE_RELATIONS,
    "title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "short_description": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "image_src": {"type": "keyword"},
    "topics": {"type": "keyword"},
    "audience": {"type": "keyword"},
    "certification": {"type": "keyword"},
    "offered_by": {"type": "keyword"},
    "created": {"type": "date"},
    "default_search_priority": {"type": "integer"},
    "minimum_price": {"type": "scaled_float", "scaling_factor": 100},
    "runs": {
        "type": "nested",
        "properties": {
            "id": {"type": "long"},
            "course_id": {"type": "keyword"},
            "title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
            "short_description": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
            "full_description": ENGLISH_TEXT_FIELD,
            "language": {"type": "keyword"},
            "level": {"type": "keyword"},
            "semester": {"type": "keyword"},
            "year": {"type": "keyword"},
            "start_date": {"type": "date"},
            "end_date": {"type": "date"},
            "enrollment_start": {"type": "date"},
            "enrollment_end": {"type": "date"},
            "topics": {"type": "keyword"},
            "instructors": {"type": "text"},
            "prices": {
                "type": "nested",
                "properties": {
                    "mode": {"type": "text"},
                    "price": {"type": "scaled_float", "scaling_factor": 100},
                },
            },
            "image_src": {"type": "keyword"},
            "published": {"type": "boolean"},
            "availability": {"type": "keyword"},
            "offered_by": {"type": "keyword"},
            "created": {"type": "date"},
            "slug": {"type": "keyword"},
        },
    },
}

COURSE_FILE_OBJECT_TYPE = {
    "run_id": {"type": "keyword"},
    "run_slug": {"type": "keyword"},
    "run_title": ENGLISH_TEXT_FIELD,
    "uid": {"type": "keyword"},
    "key": {"type": "keyword"},
    "url": {"type": "keyword"},
    "short_url": {"type": "keyword"},
    "section": {"type": "keyword"},
    "section_slug": {"type": "keyword"},
    "file_type": {"type": "keyword"},
    "content_type": {"type": "keyword"},
    "content": ENGLISH_TEXT_FIELD,
    "location": {"type": "keyword"},
    "resource_type": {"type": "keyword"},
}

COURSE_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    **COURSE_FILE_OBJECT_TYPE,
    "id": {"type": "long"},
    "course_id": {"type": "keyword"},
    "full_description": ENGLISH_TEXT_FIELD,
    "platform": {"type": "keyword"},
    "published": {"type": "boolean"},
    "department_name": {"type": "keyword"},
    "course_feature_tags": {"type": "keyword"},
    "coursenum": {"type": "keyword"},
    "department_course_numbers": {
        "type": "nested",
        "properties": {
            "coursenum": {"type": "keyword"},
            "sort_coursenum": {"type": "keyword"},
            "department": {"type": "keyword"},
            "primary": {"type": "boolean"},
        },
    },
}


PROGRAM_OBJECT_TYPE = {**LEARNING_RESOURCE_TYPE, "id": {"type": "long"}}

LIST_OBJECT_TYPE = {
    **RESOURCE_RELATIONS,
    "audience": {"type": "keyword"},
    "certification": {"type": "keyword"},
    "id": {"type": "long"},
    "title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "short_description": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "image_src": {"type": "keyword"},
    "topics": {"type": "keyword"},
    "author": {"type": "keyword"},
    "privacy_level": {"type": "keyword"},
    "list_type": {"type": "keyword"},
    "created": {"type": "date"},
    "default_search_priority": {"type": "integer"},
    "minimum_price": {"type": "scaled_float", "scaling_factor": 100},
}

VIDEO_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "video_id": {"type": "keyword"},
    "platform": {"type": "keyword"},
    "full_description": ENGLISH_TEXT_FIELD,
    "transcript": ENGLISH_TEXT_FIELD,
    "published": {"type": "boolean"},
}

PODCAST_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "full_description": ENGLISH_TEXT_FIELD,
    "url": {"type": "keyword"},
}

PODCAST_EPISODE_OBJECT_TYPE = {
    **LEARNING_RESOURCE_TYPE,
    "id": {"type": "long"},
    "podcast_id": {"type": "long"},
    "series_title": ENGLISH_TEXT_FIELD_WITH_SUGGEST,
    "full_description": ENGLISH_TEXT_FIELD,
    "url": {"type": "keyword"},
    "last_modified": {"type": "date"},
}

MAPPING = {
    POST_TYPE: {
        **CONTENT_OBJECT_TYPE,
        "post_link_url": {"type": "keyword"},
        "post_link_thumbnail": {"type": "keyword"},
        "num_comments": {"type": "long"},
        "plain_text": ENGLISH_TEXT_FIELD,
        "post_type": {"type": "keyword"},
    },
    COMMENT_TYPE: {
        **CONTENT_OBJECT_TYPE,
        "comment_id": {"type": "keyword"},
        "parent_comment_id": {"type": "keyword"},
        "parent_post_removed": {"type": "boolean"},
    },
    PROFILE_TYPE: PROFILE_OBJECT_TYPE,
    COURSE_TYPE: COURSE_OBJECT_TYPE,
    PROGRAM_TYPE: PROGRAM_OBJECT_TYPE,
    USER_LIST_TYPE: LIST_OBJECT_TYPE,
    USER_PATH_TYPE: LIST_OBJECT_TYPE,
    STAFF_LIST_TYPE: LIST_OBJECT_TYPE,
    VIDEO_TYPE: VIDEO_OBJECT_TYPE,
    PODCAST_TYPE: PODCAST_OBJECT_TYPE,
    PODCAST_EPISODE_TYPE: PODCAST_EPISODE_OBJECT_TYPE,
}

SEARCH_CONN_EXCEPTIONS = (ESConnectionError, UrlTimeoutError)
REDDIT_EXCEPTIONS = (PrawcoreException, PRAWException)
