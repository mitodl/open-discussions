"""ETL pipelines"""

from toolz import compose, curried, curry

from course_catalog.constants import PlatformType
from course_catalog.etl import (
    loaders,
    micromasters,
    mitx,
    mitxonline,
    ocw,
    oll,
    podcast,
    prolearn,
    video,
    xpro,
    youtube,
)
from course_catalog.etl.constants import (
    CourseLoaderConfig,
    LearningResourceRunLoaderConfig,
    OfferedByLoaderConfig,
    ProgramLoaderConfig,
)
from course_catalog.models import Course, Program

# A few notes on how this module works:
#
# - Each pipeline is composed right-to-left
# - We define normalized loaders of data in loaders.py
# - Each integration must define an extraction function to fetch the data
# - Each integration must define an transformation function to normalize the data
# - Additional specifics are commented on as needed

load_programs = curry(loaders.load_programs)
load_courses = curry(loaders.load_courses)

micromasters_etl = compose(
    load_programs(
        PlatformType.micromasters.value,
        # MicroMasters courses overlap with MITx, so configure course and run level offerors to be additive
        config=ProgramLoaderConfig(
            courses=CourseLoaderConfig(
                offered_by=OfferedByLoaderConfig(additive=True),
                runs=LearningResourceRunLoaderConfig(
                    offered_by=OfferedByLoaderConfig(additive=True)
                ),
            )
        ),
    ),
    micromasters.transform,
    micromasters.extract,
)

xpro_programs_etl = compose(
    load_programs(PlatformType.xpro.value),
    xpro.transform_programs,
    xpro.extract_programs,
)
xpro_courses_etl = compose(
    load_courses(PlatformType.xpro.value, config=CourseLoaderConfig(prune=True)),
    xpro.transform_courses,
    xpro.extract_courses,
)

mitxonline_programs_etl = compose(
    load_programs(
        PlatformType.mitxonline.value,
        config=ProgramLoaderConfig(courses=CourseLoaderConfig(prune=True)),
    ),
    mitxonline.transform_programs,
    mitxonline.extract_programs,
)
mitxonline_courses_etl = compose(
    load_courses(PlatformType.mitxonline.value, config=CourseLoaderConfig(prune=True)),
    mitxonline.transform_courses,
    mitxonline.extract_courses,
)

mitx_etl = compose(
    load_courses(
        PlatformType.mitx.value,
        # MicroMasters courses overlap with MITx, so configure course and run level offerors to be additive
        config=CourseLoaderConfig(
            prune=True,
            offered_by=OfferedByLoaderConfig(additive=True),
            runs=LearningResourceRunLoaderConfig(
                offered_by=OfferedByLoaderConfig(additive=True)
            ),
        ),
    ),
    mitx.transform,
    # for the sake of not touching OCW code, we've implementing this function here in discussions
    # it takes the concatenated raw results from MITx and uploads them as a json file to the OCW bucket
    # we'll probably do away with this at later date when we can easily move it into OCW
    # NOTE: do() runs the func with the input and then returns the input
    curried.do(ocw.upload_mitx_course_manifest),
    mitx.extract,
)

oll_etl = compose(
    load_courses(PlatformType.oll.value, config=CourseLoaderConfig(prune=True)),
    oll.transform,
    oll.extract,
)

youtube_etl = compose(loaders.load_video_channels, youtube.transform, youtube.extract)

# pipeline for generating topic data for videos based on course topics
video_topics_etl = compose(loaders.load_videos, video.extract_videos_topics)

podcast_etl = compose(loaders.load_podcasts, podcast.transform, podcast.extract)


def prolearn_programs_etl() -> list[Program]:
    """Iterate through all supported prolearn platforms to import programs"""
    results = []
    for platform in prolearn.PROLEARN_DEPARTMENT_MAPPING.keys():
        platform_func = compose(
            load_programs(platform),
            prolearn.transform_programs,
            prolearn.extract_programs,
        )
        results.extend(platform_func(platform))
    return results


def prolearn_courses_etl() -> list[Course]:
    """Iterate through all supported prolearn platforms to import courses"""
    results = []
    for platform in prolearn.PROLEARN_DEPARTMENT_MAPPING.keys():
        platform_func = compose(
            load_courses(platform),
            prolearn.transform_courses,
            prolearn.extract_courses,
        )
        results.extend(platform_func(platform))
    return results
