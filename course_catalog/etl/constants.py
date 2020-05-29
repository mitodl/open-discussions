"""Constants for course catalog ETL processes"""
from collections import namedtuple

from django.conf import settings

# A custom UA so that operators of OpenEdx will know who is pinging their service
COMMON_HEADERS = {
    "User-Agent": f"CourseCatalogBot/{settings.VERSION} ({settings.SITE_BASE_URL})"
}


OfferedByLoaderConfig = namedtuple(
    "OfferedByLoaderConfig", ["additive"], defaults=[False]
)
LearningResourceRunLoaderConfig = namedtuple(
    "RunLoaderConfig", ["offered_by"], defaults=[OfferedByLoaderConfig()]
)

CourseLoaderConfig = namedtuple(
    "CourseLoaderConfig",
    ["prune", "offered_by", "runs"],
    defaults=[True, OfferedByLoaderConfig(), LearningResourceRunLoaderConfig()],
)

ProgramLoaderConfig = namedtuple(
    "ProgramLoaderConfig",
    ["courses", "offered_by", "runs"],
    defaults=[
        CourseLoaderConfig(),
        OfferedByLoaderConfig(),
        LearningResourceRunLoaderConfig(),
    ],
)

PodcastEpisodeLoaderConfig = namedtuple(
    "PodcastEpisodeLoaderConfig",
    ["offered_by", "runs"],
    defaults=[OfferedByLoaderConfig(), LearningResourceRunLoaderConfig()],
)

PodcastLoaderConfig = namedtuple(
    "PodcastLoaderConfig",
    ["episodes", "offered_by", "runs"],
    defaults=[
        PodcastEpisodeLoaderConfig(),
        OfferedByLoaderConfig(),
        LearningResourceRunLoaderConfig(),
    ],
)

VideoLoaderConfig = namedtuple(
    "VideoLoaderConfig",
    ["offered_by", "runs"],
    defaults=[OfferedByLoaderConfig(), LearningResourceRunLoaderConfig()],
)

PlaylistLoaderConfig = namedtuple(
    "PlaylistLoaderConfig",
    ["offered_by", "videos"],
    defaults=[OfferedByLoaderConfig(), VideoLoaderConfig()],
)
