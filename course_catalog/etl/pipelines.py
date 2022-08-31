"""ETL pipelines"""
from toolz import compose, curry, curried

from course_catalog.etl import (
    micromasters,
    loaders,
    see,
    mitpe,
    csail,
    mitx,
    xpro,
    mitxonline,
    ocw,
    oll,
    video,
    youtube,
    podcast,
)
from course_catalog.etl.constants import (
    ProgramLoaderConfig,
    CourseLoaderConfig,
    LearningResourceRunLoaderConfig,
    OfferedByLoaderConfig,
)
from course_catalog.constants import PlatformType

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
    load_courses(PlatformType.xpro.value), xpro.transform_courses, xpro.extract_courses
)

mitxonline_programs_etl = compose(
    load_programs(PlatformType.mitxonline.value),
    mitxonline.transform_programs,
    mitxonline.extract_programs,
)
mitxonline_courses_etl = compose(
    load_courses(PlatformType.mitxonline.value),
    mitxonline.transform_courses,
    mitxonline.extract_courses,
)

mitx_etl = compose(
    load_courses(
        PlatformType.mitx.value,
        # MicroMasters courses overlap with MITx, so configure course and run level offerors to be additive
        config=CourseLoaderConfig(
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

oll_etl = compose(load_courses(PlatformType.oll.value), oll.transform, oll.extract)

see_etl = compose(
    load_courses(PlatformType.see.value, config=CourseLoaderConfig(prune=False)),
    see.transform,
    see.extract,
)

mitpe_etl = compose(
    load_courses(PlatformType.mitpe.value, config=CourseLoaderConfig(prune=False)),
    mitpe.transform,
    mitpe.extract,
)

csail_etl = compose(
    load_courses(PlatformType.csail.value, config=CourseLoaderConfig(prune=False)),
    csail.transform,
    csail.extract,
)

youtube_etl = compose(loaders.load_video_channels, youtube.transform, youtube.extract)

# pipeline for generating topic data for videos based on course topics
video_topics_etl = compose(loaders.load_videos, video.extract_videos_topics)

podcast_etl = compose(loaders.load_podcasts, podcast.transform, podcast.extract)
