"""Common video extraction functions"""
from django.conf import settings

from course_catalog.models import Video
from search.api import get_similar_topics


def extract_topics(video):
    """Extract a video's topics

    Args:
        video (course_catalog.models.Video):
            the video the caluclate topics for

    Returns:
        list of dict:
            list of topic data for the video

    """
    text_doc = {"title": video.title, "short_description": video.short_description}

    topic_names = get_similar_topics(
        text_doc,
        settings.OPEN_VIDEO_MAX_TOPICS,
        settings.OPEN_VIDEO_MIN_TERM_FREQ,
        settings.OPEN_VIDEO_MIN_DOC_FREQ,
    )

    return [{"name": topic_name} for topic_name in topic_names]


def extract_videos_topics(*, video_ids=None):
    """Extract video topics for some or all of published videos

    Args:
        video_ids (list of str or None): optional list of video ids

    Yields:
        dict:
            normalized video object with topics

    """
    videos = (
        Video.objects.filter(published=True)
        .only("video_id", "platform", "title", "short_description")
        .order_by("id")
    )

    if video_ids:
        videos = videos.filter(id__in=video_ids)

    for video in videos.iterator():
        yield {
            "video_id": video.video_id,
            "platform": video.platform,
            "topics": extract_topics(video),
        }
