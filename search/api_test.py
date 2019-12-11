# pylint: disable=redefined-outer-name
"""Search API function tests"""

import pytest
from django.contrib.auth.models import AnonymousUser
from django.contrib.contenttypes.models import ContentType

from channels.constants import CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_RESTRICTED
from channels.api import add_user_role
from channels.factories.models import ChannelFactory
from course_catalog.constants import PrivacyLevel
from course_catalog.factories import (
    CourseFactory,
    UserListFactory,
    UserListUserListFactory,
)
from course_catalog.models import FavoriteItem
from open_discussions.factories import UserFactory
from search.api import (
    execute_search,
    is_reddit_object_removed,
    gen_post_id,
    gen_comment_id,
    gen_video_id,
    find_related_documents,
    get_similar_topics,
    transform_results,
)
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    GLOBAL_DOC_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
    COURSE_TYPE,
)
from search.serializers import ESCourseSerializer, ESUserListSerializer


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


@pytest.mark.parametrize("is_anonymous", [True, False])
@pytest.mark.parametrize("inject_favorites", [True, False])
@pytest.mark.django_db
def test_transform_results(user, is_anonymous, inject_favorites):
    """
    transform_results should transform reverse nested availability results if present, and move
    scripted fields into the source result
    """

    favorited_course = CourseFactory.create()
    generic_course = CourseFactory.create()
    listed_learningpath = UserListFactory.create(
        author=UserFactory.create(), list_type=LEARNING_PATH_TYPE
    )
    user_list = UserListFactory.create(author=user)

    if not is_anonymous:
        FavoriteItem.objects.create(
            user=user,
            content_type=ContentType.objects.get(model=COURSE_TYPE),
            object_id=favorited_course.id,
        )
        item_id = UserListUserListFactory.create(
            user_list=user_list,
            content_type=ContentType.objects.get(model=USER_LIST_TYPE),
            object_id=listed_learningpath.id,
        ).id
    else:
        item_id = None

    raw_hits = [
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a0",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeA",
            "_score": 1.0,
            "_source": ESCourseSerializer(generic_course).data,
        },
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a1",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeB",
            "_score": 1.0,
            "_source": ESCourseSerializer(favorited_course).data,
        },
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a2",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeC",
            "_score": 1.0,
            "_source": ESUserListSerializer(listed_learningpath).data,
        },
    ]

    expected_hits = [
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a0",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeA",
            "_score": 1.0,
            "_source": {
                **ESCourseSerializer(generic_course).data,
                "is_favorite": False,
                "lists": [],
            },
        },
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a1",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeB",
            "_score": 1.0,
            "_source": {
                **ESCourseSerializer(favorited_course).data,
                "is_favorite": True,
                "lists": [],
            },
        },
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a2",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeC",
            "_score": 1.0,
            "_source": {
                **ESUserListSerializer(listed_learningpath).data,
                "is_favorite": False,
                "lists": [{"list_id": user_list.id, "item_id": item_id}],
            },
        },
    ]

    results = {
        "hits": {"hits": raw_hits},
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

    search_user = AnonymousUser() if is_anonymous else user
    assert transform_results(results, search_user, inject_favorites) == {
        "hits": {
            "hits": raw_hits
            if (is_anonymous or not inject_favorites)
            else expected_hits
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
    assert (
        transform_results(results, search_user, inject_favorites)["aggregations"]
        == results["aggregations"]
    )
    results["aggregations"].pop("availability", None)
    results["aggregations"].pop("cost", None)
    assert (
        transform_results(results, search_user, inject_favorites)["aggregations"]
        == results["aggregations"]
    )


def test_get_similar_topics(settings, mocker):
    """Test get_similar_topics makes a query for similar document topics"""
    input_doc = {"title": "title text", "description": "description text"}
    get_conn_mock = mocker.patch("search.api.get_conn", autospec=True)

    # topic d is least popular and should not show up, order does not matter
    get_conn_mock.return_value.search.return_value = {
        "hits": {
            "hits": [
                {"_source": {"topics": ["topic a", "topic b", "topic d"]}},
                {"_source": {"topics": ["topic a", "topic c"]}},
                {"_source": {"topics": ["topic a", "topic c"]}},
                {"_source": {"topics": ["topic a", "topic c"]}},
                {"_source": {"topics": ["topic a", "topic b"]}},
            ]
        }
    }

    # results should be top 3 in decreasing order of frequency
    assert get_similar_topics(input_doc, 3, 1, 15) == ["topic a", "topic c", "topic b"]

    get_conn_mock.return_value.search.assert_called_once_with(
        body={
            "_source": {"includes": "topics"},
            "query": {
                "bool": {
                    "filter": [{"terms": {"object_type": ["course"]}}],
                    "must": [
                        {
                            "more_like_this": {
                                "like": [
                                    {
                                        "doc": input_doc,
                                        "fields": ["title", "description"],
                                    }
                                ],
                                "fields": [
                                    "course_id",
                                    "title",
                                    "short_description",
                                    "full_description",
                                ],
                                "min_term_freq": 1,
                                "min_doc_freq": 15,
                            }
                        }
                    ],
                }
            },
        },
        doc_type=[],
        index=[f"{settings.ELASTICSEARCH_INDEX}_all_default"],
    )
