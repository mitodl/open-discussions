"""Tests for common video extractors"""
import pytest

from course_catalog.etl.video import extract_topics, extract_videos_topics
from course_catalog.factories import VideoFactory

pytestmark = pytest.mark.django_db


def test_extract_topics(settings, mocker):
    """Tests that extract_topics looks up similar topics given a video"""
    video = VideoFactory.create()
    topics = ["topic a", "topic b"]
    mock_get_similar_topics = mocker.patch(
        "course_catalog.etl.video.get_similar_topics", return_value=topics
    )

    assert extract_topics(video) == [{"name": topic} for topic in topics]

    mock_get_similar_topics.assert_called_once_with(
        {"title": video.title, "short_description": video.short_description},
        settings.OPEN_VIDEO_MAX_TOPICS,
        settings.OPEN_VIDEO_MIN_TERM_FREQ,
        settings.OPEN_VIDEO_MIN_DOC_FREQ,
    )


@pytest.mark.parametrize("use_video_ids", [True, False])
def test_extract_videos_topics(mocker, use_video_ids):
    """Tests that extract_videos_topics yields objects for each video with topics"""
    published_videos = VideoFactory.create_batch(3, published=True)
    # shouldn't be extracted
    VideoFactory.create_batch(3, published=False)

    topic_results = [
        [f"topic-{idx}-a", f"topic-{idx}-b"] for idx in range(len(published_videos))
    ]

    mock_get_similar_topics = mocker.patch(
        "course_catalog.etl.video.get_similar_topics", side_effect=topic_results
    )

    if use_video_ids:
        published_videos = published_videos[:1]

    result = list(
        extract_videos_topics(
            video_ids=[published_videos[0].id] if use_video_ids else None
        )
    )

    assert len(result) == len(published_videos)

    for video, topics in zip(published_videos, topic_results):
        assert {
            "video_id": video.video_id,
            "platform": video.platform,
            "topics": [{"name": topic} for topic in topics],
        } in result

    assert mock_get_similar_topics.call_count == (
        1 if use_video_ids else len(published_videos)
    )
