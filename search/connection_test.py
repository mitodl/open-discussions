"""
Tests for the indexing API
"""
import pytest

from search.connection import get_active_aliases
from search.constants import COURSE_TYPE


@pytest.mark.parametrize("include_reindexing", [True, False])
@pytest.mark.parametrize("indexes_exist", [True, False])
@pytest.mark.parametrize("object_types", [None, [COURSE_TYPE]])
def test_get_active_aliases(mocker, include_reindexing, indexes_exist, object_types):
    """Test for get_active_aliases"""
    conn = mocker.Mock()
    conn.indices.exists.return_value = indexes_exist

    active_aliases = get_active_aliases(
        conn, object_types=object_types, include_reindexing=include_reindexing
    )

    if indexes_exist:
        if object_types:
            if include_reindexing:
                assert active_aliases == [
                    "testindex_course_default",
                    "testindex_course_reindexing",
                ]
            else:
                assert active_aliases == ["testindex_course_default"]
        else:
            if include_reindexing:
                assert active_aliases == [
                    "testindex_post_default",
                    "testindex_post_reindexing",
                    "testindex_comment_default",
                    "testindex_comment_reindexing",
                    "testindex_profile_default",
                    "testindex_profile_reindexing",
                    "testindex_course_default",
                    "testindex_course_reindexing",
                    "testindex_program_default",
                    "testindex_program_reindexing",
                    "testindex_userlist_default",
                    "testindex_userlist_reindexing",
                    "testindex_stafflist_default",
                    "testindex_stafflist_reindexing",
                    "testindex_video_default",
                    "testindex_video_reindexing",
                    "testindex_podcast_default",
                    "testindex_podcast_reindexing",
                    "testindex_podcastepisode_default",
                    "testindex_podcastepisode_reindexing",
                ]
            else:
                assert active_aliases == [
                    "testindex_post_default",
                    "testindex_comment_default",
                    "testindex_profile_default",
                    "testindex_course_default",
                    "testindex_program_default",
                    "testindex_userlist_default",
                    "testindex_stafflist_default",
                    "testindex_video_default",
                    "testindex_podcast_default",
                    "testindex_podcastepisode_default",
                ]
    else:
        assert active_aliases == []
