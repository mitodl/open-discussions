# pylint: disable=redefined-outer-name
"""Search API function tests"""
from django.contrib.auth.models import AnonymousUser
import pytest

from channels.constants import CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_RESTRICTED
from channels.api import add_user_role
from channels.factories.models import ChannelFactory
from course_catalog.constants import PrivacyLevel
from search.api import (
    execute_search,
    is_reddit_object_removed,
    gen_post_id,
    gen_comment_id,
    gen_video_id,
    find_related_documents,
    transform_aggregates,
)
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    GLOBAL_DOC_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
)


@pytest.fixture()
def gen_query_filters_mock(mocker):
    """Mock _apply_general_query_filters"""

    def return_search_arg(
        search, *args
    ):  # pylint: disable=missing-docstring,unused-argument
        return search

    return mocker.patch(
        "search.api._apply_general_query_filters", side_effect=return_search_arg
    )


def test_gen_post_id():
    """Test that gen_post_id returns an expected id"""
    assert gen_post_id("1") == "p_1"


def test_gen_comment_id():
    """Test that gen_comment_id returns an expected id"""
    assert gen_comment_id("1") == "c_1"


def test_gen_video_id(mocker):
    """Test that gen_video_id returns an expected id"""
    assert (
        gen_video_id(mocker.Mock(platform="youtube", video_id="8gjuY2"))
        == "video_youtube_8gjuY2"
    )


@pytest.mark.parametrize(
    "banned_by_val,approved_by_val,expected_value",
    [
        ("admin_username", "", True),
        ("admin_username", None, True),
        ("admin_username", "admin_username", False),
        ("", None, False),
        (None, None, False),
    ],
)
def test_is_reddit_object_removed(
    mocker, banned_by_val, approved_by_val, expected_value
):
    """
    Tests that is_reddit_object_removed returns the expected values based on the
    banned_by and approved_by properties for the given object
    """
    reddit_obj = mocker.Mock(banned_by=banned_by_val, approved_by=approved_by_val)
    assert is_reddit_object_removed(reddit_obj) is expected_value


def test_execute_search(mocker, user):
    """execute_search should execute an Elasticsearch search"""
    get_conn_mock = mocker.patch("search.api.get_conn", autospec=True)
    channels = sorted(ChannelFactory.create_batch(2), key=lambda channel: channel.name)
    add_user_role(channels[0], "moderators", user)
    add_user_role(channels[1], "contributors", user)

    query = {"a": "query"}
    assert (
        execute_search(user=user, query=query)
        == get_conn_mock.return_value.search.return_value
    )
    get_conn_mock.return_value.search.assert_called_once_with(
        body={
            **query,
            "query": {
                "bool": {
                    "filter": [
                        {
                            "bool": {
                                "should": [
                                    {
                                        "bool": {
                                            "must_not": [
                                                {
                                                    "terms": {
                                                        "object_type": [
                                                            "comment",
                                                            "post",
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "terms": {
                                            "channel_type": [
                                                CHANNEL_TYPE_PUBLIC,
                                                CHANNEL_TYPE_RESTRICTED,
                                            ]
                                        }
                                    },
                                    {
                                        "terms": {
                                            "channel_name": [
                                                channel.name for channel in channels
                                            ]
                                        }
                                    },
                                ]
                            }
                        },
                        {
                            "bool": {
                                "should": [
                                    {
                                        "bool": {
                                            "must": [
                                                {"term": {"deleted": False}},
                                                {"term": {"removed": False}},
                                            ]
                                        }
                                    },
                                    {
                                        "bool": {
                                            "must_not": [
                                                {
                                                    "terms": {
                                                        "object_type": [
                                                            "comment",
                                                            "post",
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                ]
                            }
                        },
                        {
                            "bool": {
                                "should": [
                                    {
                                        "bool": {
                                            "must_not": [
                                                {
                                                    "terms": {
                                                        "object_type": [
                                                            USER_LIST_TYPE,
                                                            LEARNING_PATH_TYPE,
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "term": {
                                            "privacy_level": PrivacyLevel.public.value
                                        }
                                    },
                                    {"term": {"author": user.id}},
                                ]
                            }
                        },
                    ]
                }
            },
        },
        doc_type=[],
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_execute_search_anonymous(mocker):
    """execute_search should execute an Elasticsearch search with an anonymous user"""
    get_conn_mock = mocker.patch("search.api.get_conn", autospec=True)

    user = AnonymousUser()
    query = {"a": "query"}
    assert (
        execute_search(user=user, query=query)
        == get_conn_mock.return_value.search.return_value
    )
    get_conn_mock.return_value.search.assert_called_once_with(
        body={
            **query,
            "query": {
                "bool": {
                    "filter": [
                        {
                            "bool": {
                                "should": [
                                    {
                                        "bool": {
                                            "must_not": [
                                                {
                                                    "terms": {
                                                        "object_type": [
                                                            "comment",
                                                            "post",
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "terms": {
                                            "channel_type": [
                                                CHANNEL_TYPE_PUBLIC,
                                                CHANNEL_TYPE_RESTRICTED,
                                            ]
                                        }
                                    },
                                ]
                            }
                        },
                        {
                            "bool": {
                                "should": [
                                    {
                                        "bool": {
                                            "must": [
                                                {"term": {"deleted": False}},
                                                {"term": {"removed": False}},
                                            ]
                                        }
                                    },
                                    {
                                        "bool": {
                                            "must_not": [
                                                {
                                                    "terms": {
                                                        "object_type": [
                                                            "comment",
                                                            "post",
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                ]
                            }
                        },
                        {
                            "bool": {
                                "should": [
                                    {
                                        "bool": {
                                            "must_not": [
                                                {
                                                    "terms": {
                                                        "object_type": [
                                                            USER_LIST_TYPE,
                                                            LEARNING_PATH_TYPE,
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "term": {
                                            "privacy_level": PrivacyLevel.public.value
                                        }
                                    },
                                ]
                            }
                        },
                    ]
                }
            },
        },
        doc_type=[],
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_find_related_documents(settings, mocker, user, gen_query_filters_mock):
    """find_related_documents should execute a more-like-this query"""
    posts_to_return = 7
    settings.OPEN_DISCUSSIONS_RELATED_POST_COUNT = posts_to_return
    post_id = "abc"
    get_conn_mock = mocker.patch("search.api.get_conn", autospec=True)

    assert (
        find_related_documents(user=user, post_id=post_id)
        == get_conn_mock.return_value.search.return_value
    )
    assert gen_query_filters_mock.call_count == 1
    constructed_query = get_conn_mock.return_value.search.call_args[1]
    assert constructed_query["body"]["query"] == {
        "more_like_this": {
            "like": {"_id": gen_post_id(post_id), "_type": GLOBAL_DOC_TYPE},
            "fields": ["plain_text", "post_title", "author_id", "channel_name"],
            "min_term_freq": 1,
            "min_doc_freq": 1,
        }
    }
    assert constructed_query["body"]["from"] == 0
    assert constructed_query["body"]["size"] == posts_to_return


def test_transform_aggregates():
    """transform_aggregates should transform reverse nested availability results if present"""
    raw_aggregate = {
        "aggregations": {
            "availability": {
                "runs": {
                    "buckets": [
                        {
                            "key": "availableNow",
                            "doc_count": 1000,
                            "courses": {"doc_count": 800},
                        },
                        {"key": "next30", "doc_count": 0, "courses": {"doc_count": 0}},
                        {"key": "next60", "doc_count": 10, "courses": {"doc_count": 7}},
                    ]
                }
            },
            "cost": {
                "prices": {
                    "buckets": [
                        {
                            "key": "free",
                            "to": 0.01,
                            "doc_count": 3290,
                            "courses": {"doc_count": 1937},
                        },
                        {
                            "key": "paid",
                            "from": 0.01,
                            "doc_count": 545,
                            "courses": {"doc_count": 267},
                        },
                    ]
                }
            },
            "topics": {"buckets": [{"key": "Engineering", "doc_count": 30}]},
        }
    }
    assert transform_aggregates(raw_aggregate) == {
        "aggregations": {
            "availability": {
                "buckets": [
                    {"key": "availableNow", "doc_count": 800},
                    {"key": "next60", "doc_count": 7},
                ]
            },
            "cost": {
                "buckets": [
                    {"key": "free", "doc_count": 1937},
                    {"key": "paid", "doc_count": 267},
                ]
            },
            "topics": {"buckets": [{"key": "Engineering", "doc_count": 30}]},
        }
    }
    raw_aggregate["aggregations"]["availability"].pop("runs", None)
    raw_aggregate["aggregations"]["cost"].pop("prices", None)
    assert transform_aggregates(raw_aggregate) == raw_aggregate
    raw_aggregate["aggregations"].pop("availability", None)
    raw_aggregate["aggregations"].pop("cost", None)
    assert transform_aggregates(raw_aggregate) == raw_aggregate
