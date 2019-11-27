# pylint: disable=redefined-outer-name
"""Search API function tests"""
from collections import defaultdict

from django.contrib.auth.models import AnonymousUser
import pytest

from channels.constants import CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_RESTRICTED
from channels.api import add_user_role
from channels.factories.models import ChannelFactory
from course_catalog.constants import PrivacyLevel
from course_catalog.factories import (
    CourseFactory,
    UserListCourseFactory,
    UserListBootcampFactory,
    UserListFactory,
    UserListVideoFactory,
)
from search.api import (
    execute_search,
    is_reddit_object_removed,
    gen_post_id,
    gen_comment_id,
    gen_video_id,
    find_related_documents,
    transform_results,
    gen_lists_dict,
    gen_course_id,
    gen_bootcamp_id,
)
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    GLOBAL_DOC_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
)
from search.serializers import ESCourseSerializer


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
            "_source": True,
            "script_fields": {
                "is_favorite": {
                    "script": {
                        "lang": "painless",
                        "inline": "params.favorites.contains(doc._id.value)",
                        "params": {"favorites": []},
                    }
                },
                "lists": {
                    "script": {
                        "lang": "painless",
                        "inline": "params.lists[doc._id.value]",
                        "params": {"lists": defaultdict(list)},
                    }
                },
            },
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


@pytest.mark.django_db
def test_transform_results():
    """
    transform_results should transform reverse nested availability results if present, and move
    scripted fields into the source result
    """
    scripted_fields = {"is_favorite": [True], "lists": [100, 101]}
    results = {
        "hits": {
            "hits": [
                {
                    "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a0",
                    "_type": "_doc",
                    "_id": "co_mitx_TUlUeCsyLjAxeA",
                    "_score": 1.0,
                    "_source": ESCourseSerializer(CourseFactory.create()).data,
                    "fields": scripted_fields,
                }
            ]
        },
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
        },
    }
    expected_source = results["hits"]["hits"][0]["_source"]
    expected_source.update(scripted_fields)
    assert transform_results(results) == {
        "hits": {
            "hits": [
                {
                    "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a0",
                    "_type": "_doc",
                    "_id": "co_mitx_TUlUeCsyLjAxeA",
                    "_score": 1.0,
                    "_source": expected_source,
                }
            ]
        },
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
        },
    }
    results["aggregations"]["availability"].pop("runs", None)
    results["aggregations"]["cost"].pop("prices", None)
    assert transform_results(results) == results
    results["aggregations"].pop("availability", None)
    results["aggregations"].pop("cost", None)
    assert transform_results(results) == results


def test_gen_lists_dict(user):
    """Test that gen_lists_dict returns an expected dict of userLists ids by ES doc id"""
    user_lists = UserListFactory.create_batch(3, author=user)
    course_items = UserListCourseFactory.create_batch(2, user_list=user_lists[0])
    bootcamp_items = UserListBootcampFactory.create_batch(2, user_list=user_lists[1])
    video_items = UserListVideoFactory.create_batch(2, user_list=user_lists[2])

    lists_dict = gen_lists_dict(user)
    for course_item in course_items:
        assert lists_dict[
            gen_course_id(course_item.item.platform, course_item.item.course_id)
        ] == [user_lists[0].id]
    for bootcamp_item in bootcamp_items:
        assert lists_dict[gen_bootcamp_id(bootcamp_item.item.course_id)] == [
            user_lists[1].id
        ]
    for video_item in video_items:
        assert lists_dict[gen_video_id(video_item.item)] == [user_lists[2].id]
