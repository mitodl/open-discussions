""" Constants for search """
from channels.constants import COMMENT_TYPE, POST_TYPE

ALIAS_ALL_INDICES = "all"
PROFILE_TYPE = "profile"
COURSE_TYPE = "course"
RESOURCE_FILE_TYPE = "resourcefile"
PROGRAM_TYPE = "program"
USER_LIST_TYPE = "userlist"
USER_PATH_TYPE = "learningpath"
VIDEO_TYPE = "video"
PODCAST_TYPE = "podcast"
PODCAST_EPISODE_TYPE = "podcastepisode"

LEARNING_RESOURCE_TYPES = (
    COURSE_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    USER_PATH_TYPE,
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
