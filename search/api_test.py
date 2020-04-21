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
    UserListItemFactory,
    VideoFactory,
    ProgramFactory,
)
from course_catalog.models import FavoriteItem
from open_discussions import features
from open_discussions.factories import UserFactory
from open_discussions.utils import extract_values
from search.api import (
    execute_search,
    is_reddit_object_removed,
    gen_post_id,
    gen_comment_id,
    gen_video_id,
    find_related_documents,
    get_similar_topics,
    transform_results,
    find_similar_resources,
    SIMILAR_RESOURCE_RELEVANT_FIELDS,
    execute_learn_search,
)
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    GLOBAL_DOC_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
    COURSE_TYPE,
    PODCAST_TYPE,
    PODCAST_EPISODE_TYPE,
)
from search.serializers import (
    ESCourseSerializer,
    ESUserListSerializer,
    ESVideoSerializer,
    ESProgramSerializer,
)


RAW_SUGGESTIONS = {
    "short_description": [
        {
            "text": "enginer",
            "offset": 0,
            "length": 3,
            "options": [
                {"text": "enginer", "score": 0.72, "collate_match": False},
                {"text": "engineers", "score": 0.019, "collate_match": True},
                {"text": "engineer", "score": 0.018, "collate_match": True},
            ],
        }
    ],
    "title": [
        {
            "text": "enginer",
            "offset": 0,
            "length": 4,
            "options": [
                {"text": "enginer", "score": 0.721, "collate_match": False},
                {"text": "engineers", "score": 0.201, "collate_match": True},
                {"text": "engineer", "score": 0.038, "collate_match": True},
                {"text": "engines", "score": 0.027, "collate_match": True},
            ],
        }
    ],
}


@pytest.fixture(autouse=True)
def search_features(settings):
    """Autouse fixture that establishes default feature flags for search tests"""
    settings.FEATURES[features.PODCAST_SEARCH] = True


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


def test_execute_search(user, elasticsearch):
    """execute_search should execute an Elasticsearch search"""
    channels = sorted(ChannelFactory.create_batch(2), key=lambda channel: channel.name)
    add_user_role(channels[0], "moderators", user)
    add_user_role(channels[1], "contributors", user)

    query = {"a": "query"}
    elasticsearch.conn.search.return_value = {"hits": {"total": 10}}

    assert (
        execute_search(user=user, query=query) == elasticsearch.conn.search.return_value
    )
    elasticsearch.conn.search.assert_called_once_with(
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
                    ]
                }
            },
        },
        doc_type=[],
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_execute_search_anonymous(elasticsearch):
    """execute_search should execute an Elasticsearch search with an anonymous user"""
    user = AnonymousUser()
    query = {"a": "query"}
    elasticsearch.conn.search.return_value = {"hits": {"total": 10}}

    assert (
        execute_search(user=user, query=query) == elasticsearch.conn.search.return_value
    )
    elasticsearch.conn.search.assert_called_once_with(
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
                    ]
                }
            },
        },
        doc_type=[],
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


@pytest.mark.parametrize("max_suggestions", [1, 3])
@pytest.mark.parametrize("suggest_min_hits", [2, 4])
def test_execute_search_with_suggestion(
    elasticsearch, suggest_min_hits, max_suggestions, settings
):
    """execute_search should execute an Elasticsearch search suggestions"""
    user = AnonymousUser()
    query = {"a": "query"}

    settings.ELASTICSEARCH_MAX_SUGGEST_HITS = suggest_min_hits
    settings.ELASTICSEARCH_MAX_SUGGEST_RESULTS = max_suggestions

    expected_suggest = (
        ["engineers", "engineer", "engines"][:max_suggestions]
        if suggest_min_hits >= 3
        else []
    )

    elasticsearch.conn.search.return_value = {
        "hits": {"total": 3},
        "suggest": RAW_SUGGESTIONS,
    }

    assert execute_search(user=user, query=query) == {
        "hits": {"total": 3},
        "suggest": expected_suggest,
    }


def test_execute_learn_search(user, elasticsearch):
    """execute_learn_search should execute an Elasticsearch search for learning resources"""
    elasticsearch.conn.search.return_value = {"hits": {"total": 10}}
    channels = sorted(ChannelFactory.create_batch(2), key=lambda channel: channel.name)
    add_user_role(channels[0], "moderators", user)
    add_user_role(channels[1], "contributors", user)

    query = {"a": "query"}
    assert (
        execute_learn_search(user=user, query=query)
        == elasticsearch.conn.search.return_value
    )
    elasticsearch.conn.search.assert_called_once_with(
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
                        }
                    ]
                }
            },
        },
        doc_type=[],
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_execute_learn_search_anonymous(elasticsearch):
    """execute_learn_search should execute an Elasticsearch search with an anonymous user"""
    elasticsearch.conn.search.return_value = {"hits": {"total": 10}}
    user = AnonymousUser()
    query = {"a": "query"}
    assert (
        execute_learn_search(user=user, query=query)
        == elasticsearch.conn.search.return_value
    )
    elasticsearch.conn.search.assert_called_once_with(
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
                        }
                    ]
                }
            },
        },
        doc_type=[],
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_execute_learn_search_podcasts(settings, user, elasticsearch):
    """execute_learn_search should execute an Elasticsearch search """
    settings.FEATURES[features.PODCAST_SEARCH] = False
    elasticsearch.conn.search.return_value = {"hits": {"total": 10}}
    query = {"a": "query"}
    assert (
        execute_learn_search(user=user, query=query)
        == elasticsearch.conn.search.return_value
    )
    first_call = elasticsearch.conn.search.call_args[1]
    assert first_call["body"]["query"]["bool"]["filter"][1] == {
        "bool": {
            "must_not": [
                {"terms": {"object_type": [PODCAST_TYPE, PODCAST_EPISODE_TYPE]}}
            ]
        }
    }


def test_find_related_documents(settings, elasticsearch, user, gen_query_filters_mock):
    """find_related_documents should execute a more-like-this query"""
    posts_to_return = 7
    settings.OPEN_DISCUSSIONS_RELATED_POST_COUNT = posts_to_return
    post_id = "abc"

    assert (
        find_related_documents(user=user, post_id=post_id)
        == elasticsearch.conn.search.return_value
    )
    assert gen_query_filters_mock.call_count == 1
    constructed_query = elasticsearch.conn.search.call_args[1]
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


def test_find_similar_resources(settings, elasticsearch, user):
    """find_similar_resources should execute a more-like-this query and not include input resource"""
    resources_to_return = 4
    settings.OPEN_DISCUSSIONS_SIMILAR_RESOURCES_COUNT = resources_to_return
    settings.OPEN_RESOURCES_MIN_TERM_FREQ = 3
    settings.OPEN_RESOURCES_MIN_DOC_FREQ = 4

    course = CourseFactory.create()

    value_doc = {
        "title": course.title,
        "short_description": course.short_description,
        "id": course.id,
        "object_type": COURSE_TYPE,
    }
    elasticsearch.conn.search.return_value = {
        "hits": {
            "hits": [
                {"_source": ESCourseSerializer(course).data},
                {"_source": ESCourseSerializer(CourseFactory.create()).data},
                {"_source": ESVideoSerializer(VideoFactory.create()).data},
                {"_source": ESUserListSerializer(UserListFactory.create()).data},
                {"_source": ESProgramSerializer(ProgramFactory.create()).data},
            ]
        }
    }

    assert find_similar_resources(user=user, value_doc=value_doc) == [
        hit["_source"]
        for hit in elasticsearch.conn.search.return_value["hits"]["hits"][1:5]
    ]
    constructed_query = elasticsearch.conn.search.call_args[1]
    assert extract_values(constructed_query, "more_like_this") == [
        {
            "like": {"doc": value_doc, "fields": list(value_doc.keys())},
            "fields": SIMILAR_RESOURCE_RELEVANT_FIELDS,
            "min_term_freq": 3,
            "min_doc_freq": 4,
        }
    ]


@pytest.mark.parametrize("max_suggestions", [1, 3])
@pytest.mark.parametrize("suggest_min_hits", [2, 4])
@pytest.mark.parametrize("is_anonymous", [True, False])
@pytest.mark.django_db
def test_transform_results(
    user, is_anonymous, suggest_min_hits, max_suggestions, settings
):  # pylint: disable=too-many-locals
    """
    transform_results should transform reverse nested availability results if present, and move
    scripted fields into the source result
    """
    settings.ELASTICSEARCH_MAX_SUGGEST_HITS = suggest_min_hits
    settings.ELASTICSEARCH_MAX_SUGGEST_RESULTS = max_suggestions
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
        item = UserListItemFactory.create(
            user_list=user_list,
            content_type=ContentType.objects.get(model=USER_LIST_TYPE),
            object_id=listed_learningpath.id,
        )
    else:
        item = None

    expected_suggest = (
        ["engineers", "engineer", "engines"][:max_suggestions]
        if suggest_min_hits >= 3
        else []
    )

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
                "lists": [
                    {
                        "list_id": user_list.id,
                        "item_id": item.id,
                        "content_type": item.content_type.name,
                        "object_id": item.object_id,
                    }
                ]
                if item
                else [],
            },
        },
    ]

    results = {
        "hits": {"hits": raw_hits, "total": 3},
        "suggest": RAW_SUGGESTIONS,
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
    assert transform_results(results, search_user) == {
        "hits": {"hits": raw_hits if is_anonymous else expected_hits, "total": 3},
        "suggest": expected_suggest,
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
        transform_results(results, search_user)["aggregations"]
        == results["aggregations"]
    )
    results["aggregations"].pop("availability", None)
    results["aggregations"].pop("cost", None)
    assert (
        transform_results(results, search_user)["aggregations"]
        == results["aggregations"]
    )


def test_get_similar_topics(settings, elasticsearch):
    """Test get_similar_topics makes a query for similar document topics"""
    input_doc = {"title": "title text", "description": "description text"}

    # topic d is least popular and should not show up, order does not matter
    elasticsearch.conn.search.return_value = {
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

    elasticsearch.conn.search.assert_called_once_with(
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
