"""ETL pipelines"""
from toolz import compose, first, juxt, curry

from course_catalog.etl import (
    micromasters,
    loaders,
    see,
    mitpe,
    csail,
    mitx,
    xpro,
    ocw,
    oll,
    video,
    youtube,
)
from course_catalog.etl.utils import log_exceptions
from course_catalog.constants import PlatformType

# A few notes on how this module works:
#
# - Each pipeline is composed right-to-left
# - We define normalized loaders of data in loaders.py
# - Each integration must define an extraction function to fetch the data
# - Each integration must define an transformation function to normalize the data
# - Each step is wrapped with log_exceptions and propogates and empty value forward (usually [])
#   - This keeps exceptions from being raised all the way up and provides contextual data for the failure
# - Additional specifics are commented on as needed
load_programs = curry(loaders.load_programs)

micromasters_etl = compose(
    load_programs(PlatformType.mitx.value), micromasters.transform, micromasters.extract
)

xpro_programs_etl = compose(
    load_programs(PlatformType.xpro.value),
    xpro.transform_programs,
    xpro.extract_programs,
)
xpro_courses_etl = compose(
    loaders.load_courses, xpro.transform_courses, xpro.extract_courses
)

mitx_etl = compose(
    loaders.load_courses,
    # take the first argument (the output of mitx.tranform)
    first,
    # duplicate the raw responses into two streams between our transformation code and the ocw/mitx manifest upload
    juxt(
        log_exceptions("Error tranforming MITx response", exc_return_value=[])(
            mitx.transform
        ),
        # for the sake of not touching OCW code, we've implementing this function here in discussions
        # it takes the concatenated raw results from MITx and uploads them as a json file to the OCW bucket
        # we'll probably do away with this at later date when we can easily move it into OCW
        log_exceptions("Error uploading MITx manifest to OCW")(
            ocw.upload_mitx_course_manifest
        ),
    ),
    log_exceptions("Error extracting MITx catalog", exc_return_value=[])(mitx.extract),
)

oll_etl = compose(loaders.load_courses, oll.transform, oll.extract)

see_etl = compose(loaders.load_courses, see.transform, see.extract)

mitpe_etl = compose(loaders.load_courses, mitpe.transform, mitpe.extract)

csail_etl = compose(loaders.load_courses, csail.transform, csail.extract)

youtube_etl = compose(loaders.load_video_channels, youtube.transform, youtube.extract)

# pipeline for generating topic data for videos based on course topics
video_topics_etl = compose(loaders.load_videos, video.extract_videos_topics)
