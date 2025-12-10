# pylint: disable=redefined-outer-name,too-many-lines
"""Search API function tests"""

import pytest
from django.contrib.auth.models import AnonymousUser
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType, PrivacyLevel
from course_catalog.factories import (
    ContentFileFactory,
    CourseFactory,
    ProgramFactory,
    UserListFactory,
    UserListItemFactory,
    VideoFactory,
)
from course_catalog.models import FavoriteItem
from open_discussions import features
from open_discussions.factories import UserFactory
from open_discussions.utils import extract_values
from search.api import (
    SIMILAR_RESOURCE_RELEVANT_FIELDS,
    execute_learn_search,
    execute_search,
    find_similar_resources,
    gen_video_id,
    get_similar_topics,
    transform_results,
)
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    COURSE_TYPE,
    GLOBAL_DOC_TYPE,
    PODCAST_EPISODE_TYPE,
    PODCAST_TYPE,
    USER_LIST_TYPE,
    USER_PATH_TYPE,
)
from search.serializers import (
    OSContentFileSerializer,
    OSCourseSerializer,
    OSProgramSerializer,
    OSUserListSerializer,
    OSVideoSerializer,
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


def test_execute_search(user, opensearch):
    """execute_search should execute an OpenSearch search"""
    channels = sorted(ChannelFactory.create_batch(2), key=lambda channel: channel.name)
    add_user_role(channels[0], "moderators", user)
    add_user_role(channels[1], "contributors", user)

    query = {"a": "query"}
    opensearch.conn.search.return_value = {"hits": {"total": 10}}

    assert execute_search(user=user, query=query) == opensearch.conn.search.return_value
    opensearch.conn.search.assert_called_once_with(
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
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_execute_search_anonymous(opensearch):
    """execute_search should execute an OpenSearch search with an anonymous user"""
    user = AnonymousUser()
    query = {"a": "query"}
    opensearch.conn.search.return_value = {"hits": {"total": 10}}

    assert execute_search(user=user, query=query) == opensearch.conn.search.return_value
    opensearch.conn.search.assert_called_once_with(
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
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


@pytest.mark.parametrize("max_suggestions", [1, 3])
@pytest.mark.parametrize("suggest_min_hits", [2, 4])
def test_execute_search_with_suggestion(
    opensearch, suggest_min_hits, max_suggestions, settings
):
    """execute_search should execute an OpenSearch search suggestions"""
    user = AnonymousUser()
    query = {"a": "query"}

    settings.OPENSEARCH_MAX_SUGGEST_HITS = suggest_min_hits
    settings.OPENSEARCH_MAX_SUGGEST_RESULTS = max_suggestions

    expected_suggest = (
        ["engineers", "engineer", "engines"][:max_suggestions]
        if suggest_min_hits >= 3
        else []
    )

    opensearch.conn.search.return_value = {
        "hits": {"total": {"value": 3, "relation": "eq"}},
        "suggest": RAW_SUGGESTIONS,
    }

    assert execute_search(user=user, query=query) == {
        "hits": {"total": 3},
        "suggest": expected_suggest,
    }


@pytest.mark.parametrize("list_search_enabled", [True, False])
@pytest.mark.parametrize("has_resource_type_subquery", [True, False])
def test_execute_learn_search(
    settings, user, opensearch, list_search_enabled, has_resource_type_subquery
):
    """execute_learn_search should execute an opensearch search for learning resources"""
    settings.FEATURES[features.USER_LIST_SEARCH] = list_search_enabled
    opensearch.conn.search.return_value = {
        "hits": {"total": {"value": 10, "relation": "eq"}}
    }
    channels = sorted(ChannelFactory.create_batch(2), key=lambda channel: channel.name)
    add_user_role(channels[0], "moderators", user)
    add_user_role(channels[1], "contributors", user)

    if has_resource_type_subquery:
        query = {"a": {"bool": {"object_type": COURSE_TYPE}}}
    else:
        query = {"a": "query"}

    assert (
        execute_learn_search(user=user, query=query)
        == opensearch.conn.search.return_value
    )
    if list_search_enabled:
        subquery = {
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
                                                        USER_PATH_TYPE,
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                },
                                {"term": {"privacy_level": PrivacyLevel.public.value}},
                                {"term": {"author": user.id}},
                            ]
                        }
                    }
                ]
            }
        }
    else:
        subquery = {
            "bool": {
                "filter": [
                    {
                        "bool": {
                            "must_not": [
                                {
                                    "terms": {
                                        "object_type": [
                                            USER_LIST_TYPE,
                                            USER_PATH_TYPE,
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    index_type = COURSE_TYPE if has_resource_type_subquery else ALIAS_ALL_INDICES
    opensearch.conn.search.assert_called_once_with(
        body={**query, "query": subquery},
        index=[get_default_alias_name(index_type)],
    )


@pytest.mark.parametrize("list_search_enabled", [True, False])
def test_execute_learn_search_anonymous(settings, opensearch, list_search_enabled):
    """execute_learn_search should execute an opensearch search with an anonymous user"""
    settings.FEATURES[features.USER_LIST_SEARCH] = list_search_enabled
    opensearch.conn.search.return_value = {
        "hits": {"total": {"value": 10, "relation": "eq"}}
    }
    user = AnonymousUser()
    query = {"a": "query"}
    assert (
        execute_learn_search(user=user, query=query)
        == opensearch.conn.search.return_value
    )
    if list_search_enabled:
        subquery = {
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
                                                        USER_PATH_TYPE,
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                },
                                {"term": {"privacy_level": PrivacyLevel.public.value}},
                            ]
                        }
                    }
                ]
            }
        }
    else:
        subquery = {
            "bool": {
                "filter": [
                    {
                        "bool": {
                            "must_not": [
                                {
                                    "terms": {
                                        "object_type": [
                                            USER_LIST_TYPE,
                                            USER_PATH_TYPE,
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    opensearch.conn.search.assert_called_once_with(
        body={
            **query,
            "query": subquery,
        },
        index=[get_default_alias_name(ALIAS_ALL_INDICES)],
    )


def test_execute_learn_search_podcasts(settings, user, opensearch):
    """execute_learn_search should execute an OpenSearch search"""
    settings.FEATURES[features.PODCAST_SEARCH] = False
    opensearch.conn.search.return_value = {
        "hits": {"total": {"value": 10, "relation": "eq"}}
    }
    query = {"a": "query"}
    assert (
        execute_learn_search(user=user, query=query)
        == opensearch.conn.search.return_value
    )
    first_call = opensearch.conn.search.call_args[1]
    assert first_call["body"]["query"]["bool"]["filter"][1] == {
        "bool": {
            "must_not": [
                {"terms": {"object_type": [PODCAST_TYPE, PODCAST_EPISODE_TYPE]}}
            ]
        }
    }



def test_find_similar_resources(settings, is_anonymous, opensearch, user):
    """find_similar_resources should execute a more-like-this query and not include input resource"""
    resources_to_return = 5
    settings.OPEN_DISCUSSIONS_SIMILAR_RESOURCES_COUNT = resources_to_return
    settings.OPEN_RESOURCES_MIN_TERM_FREQ = 3
    settings.OPEN_RESOURCES_MIN_DOC_FREQ = 4

    course = CourseFactory.create()
    favorited_course = CourseFactory.create()
    saved_course = CourseFactory.create()
    user_list = UserListFactory.create(author=user)

    if not is_anonymous:
        FavoriteItem.objects.create(
            user=user,
            content_type=ContentType.objects.get(model=COURSE_TYPE),
            object_id=favorited_course.id,
        )
        item = UserListItemFactory.create(
            user_list=user_list,
            content_type=ContentType.objects.get(model=COURSE_TYPE),
            object_id=saved_course.id,
        )

    search_user = AnonymousUser() if is_anonymous else user

    value_doc = {
        "title": course.title,
        "short_description": course.short_description,
        "id": course.id,
        "object_type": COURSE_TYPE,
    }
    opensearch.conn.search.return_value = {
        "hits": {
            "hits": [
                {"_source": OSCourseSerializer(course).data},
                {"_source": OSCourseSerializer(favorited_course).data},
                {"_source": OSCourseSerializer(saved_course).data},
                {"_source": OSVideoSerializer(VideoFactory.create()).data},
                {"_source": OSProgramSerializer(ProgramFactory.create()).data},
                {"_source": OSUserListSerializer(UserListFactory.create()).data},
                {"_source": OSContentFileSerializer(ContentFileFactory.create()).data},
            ]
        }
    }
    similar_resources = find_similar_resources(user=search_user, value_doc=value_doc)

    assert similar_resources == [
        hit["_source"]
        for hit in opensearch.conn.search.return_value["hits"]["hits"][1:6]
    ]

    if is_anonymous:
        assert similar_resources[0]["is_favorite"] is False
        assert similar_resources[1]["lists"] == []
    else:
        assert similar_resources[0]["is_favorite"] is True
        assert similar_resources[1]["lists"] == [
            {
                "list_id": user_list.id,
                "item_id": item.id,
                "content_type": item.content_type.name,
                "object_id": item.object_id,
            }
        ]

    constructed_query = opensearch.conn.search.call_args[1]
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
    transform_results should move scripted fields into the source result
    """
    settings.OPENSEARCH_MAX_SUGGEST_HITS = suggest_min_hits
    settings.OPENSEARCH_MAX_SUGGEST_RESULTS = max_suggestions
    favorited_course = CourseFactory.create()
    generic_course = CourseFactory.create()
    listed_learningpath = UserListFactory.create(
        author=UserFactory.create(), list_type=USER_PATH_TYPE
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
            "_source": OSCourseSerializer(generic_course).data,
        },
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a1",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeB",
            "_score": 1.0,
            "_source": OSCourseSerializer(favorited_course).data,
        },
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a2",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeC",
            "_score": 1.0,
            "_source": OSUserListSerializer(listed_learningpath).data,
        },
    ]

    expected_hits = [
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a0",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeA",
            "_score": 1.0,
            "_source": {
                **OSCourseSerializer(generic_course).data,
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
                **OSCourseSerializer(favorited_course).data,
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
                **OSUserListSerializer(listed_learningpath).data,
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
        "hits": {"hits": raw_hits, "total": {"value": 3, "relation": "eq"}},
        "suggest": RAW_SUGGESTIONS,
        "aggregations": {
            "agg_filter_topics": {
                "doc_count": 30,
                "topics": {"buckets": [{"key": "Engineering", "doc_count": 30}]},
            },
            "agg_filter_course_feature_tags": {
                "doc_count": 20,
                "course_feature_tags": {
                    "buckets": [{"key": "Problems with Solutions", "doc_count": 20}]
                },
            },
        },
    }

    search_user = AnonymousUser() if is_anonymous else user
    assert transform_results(results, search_user, []) == {
        "hits": {"hits": raw_hits if is_anonymous else expected_hits, "total": 3},
        "suggest": expected_suggest,
        "aggregations": {
            "topics": {"buckets": [{"key": "Engineering", "doc_count": 30}]},
            "course_feature_tags": {
                "buckets": [{"key": "Problems with Solutions", "doc_count": 20}]
            },
        },
    }
    assert (
        transform_results(results, search_user, [])["aggregations"]
        == results["aggregations"]
    )


@pytest.mark.parametrize("department_fitler", [["Chemistry", "Biology"], [], ["Math"]])
@pytest.mark.django_db
def test_transform_department_filter(department_fitler):
    """
    transform_results should replace coursenum if there is a department filter
    """

    course = CourseFactory.create(
        course_id="HASH+1.1",
        extra_course_numbers=["5.1", "7.1"],
        platform=PlatformType.ocw.value,
    )

    raw_hits = [
        {
            "_index": "discussions_local_course_681a7db4cba9432c84c3723c2f81b1a0",
            "_type": "_doc",
            "_id": "co_mitx_TUlUeCsyLjAxeA",
            "_score": 1.0,
            "_source": OSCourseSerializer(course).data,
        }
    ]

    results = {
        "hits": {"hits": raw_hits, "total": {"value": 3, "relation": "eq"}},
        "aggregations": {
            "agg_filter_topics": {
                "doc_count": 30,
                "topics": {"buckets": [{"key": "Engineering", "doc_count": 30}]},
            },
            "agg_filter_course_feature_tags": {
                "doc_count": 20,
                "course_feature_tags": {
                    "buckets": [{"key": "Problems with Solutions", "doc_count": 20}]
                },
            },
        },
    }

    transformed_results = transform_results(results, AnonymousUser(), department_fitler)

    if department_fitler == ["Chemistry", "Biology"]:
        expected_course_num = "5.1"
    else:
        expected_course_num = "1.1"

    assert (
        transformed_results["hits"]["hits"][0]["_source"]["coursenum"]
        == expected_course_num
    )


@pytest.mark.django_db
def test_transform_department_name_aggregations():
    """
    Aggregations with filters are nested under `agg_filter_<key>`. transform_results should unnest them
    """
    results = {
        "hits": {"hits": {}, "total": {"value": 15, "relation": "eq"}},
        "suggest": {},
        "aggregations": {
            "agg_filter_department_name": {
                "doc_count": 11680,
                "department_name": {
                    "buckets": [
                        {"key": "Professional Cake Decoration", "doc_count": 72},
                        {"key": "Cat and Dog Studies", "doc_count": 44},
                        {"key": "Professional Wrestling", "doc_count": 269},
                    ]
                },
            }
        },
    }

    expected_transformed_results = results.copy()
    expected_transformed_results["suggest"] = []
    expected_transformed_results["aggregations"][
        "department_name"
    ] = expected_transformed_results["aggregations"]["agg_filter_department_name"][
        "department_name"
    ]

    assert (
        transform_results(results, AnonymousUser(), []) == expected_transformed_results
    )


@pytest.mark.django_db
def test_transform_level_aggregation():
    """
    Aggregations with filters are nested under `agg_filter_<key>`. transform_results should unnest them
    """
    results = {
        "hits": {"hits": {}, "total": {"value": 15, "relation": "eq"}},
        "suggest": {},
        "aggregations": {
            "agg_filter_level": {
                "doc_count": 691,
                "level": {
                    "doc_count": 879,
                    "level": {
                        "doc_count_error_upper_bound": 0,
                        "sum_other_doc_count": 0,
                        "buckets": [
                            {
                                "key": "Undergraduate",
                                "doc_count": 512,
                                "courses": {"doc_count": 399},
                            },
                            {
                                "key": "Graduate",
                                "doc_count": 364,
                                "courses": {"doc_count": 291},
                            },
                            {
                                "key": "Non Credit",
                                "doc_count": 3,
                                "courses": {"doc_count": 3},
                            },
                        ],
                    },
                },
            }
        },
    }

    expected_transformed_results = results.copy()
    expected_transformed_results["suggest"] = []
    expected_transformed_results["aggregations"][
        "level"
    ] = expected_transformed_results["aggregations"]["agg_filter_level"]["level"][
        "level"
    ]

    assert (
        transform_results(results, AnonymousUser(), []) == expected_transformed_results
    )


@pytest.mark.django_db
def test_transform_topics_aggregations():
    """
    Topics Aggregations with filters are nested under `agg_filter_topics`. transform_results should unnest them
    """
    results = {
        "hits": {"hits": {}, "total": {"value": 15, "relation": "eq"}},
        "suggest": {},
        "aggregations": {
            "agg_filter_topics": {
                "doc_count": 11680,
                "topics": {
                    "buckets": [
                        {"key": "Engineering", "doc_count": 7232},
                        {"key": "Science", "doc_count": 4404},
                        {"key": "Physics", "doc_count": 2639},
                    ]
                },
            }
        },
    }

    expected_transformed_results = results.copy()
    expected_transformed_results["suggest"] = []
    expected_transformed_results["aggregations"][
        "topics"
    ] = expected_transformed_results["aggregations"]["agg_filter_topics"]["topics"]

    assert (
        transform_results(results, AnonymousUser(), []) == expected_transformed_results
    )


@pytest.mark.django_db
def test_transform_resource_type_aggregations():
    """
    Resource_type Aggregations with filters are nested under `agg_filter_resource_type`.
    transform_results should unnest them
    """
    results = {
        "hits": {"hits": {}, "total": {"value": 15, "relation": "eq"}},
        "suggest": {},
        "aggregations": {
            "agg_filter_resource_type": {
                "doc_count": 660,
                "resource_type": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                        {"key": "Assignments", "doc_count": 252},
                        {"key": "Lecture Notes", "doc_count": 207},
                        {"key": "Recitations", "doc_count": 75},
                        {"key": "Readings", "doc_count": 71},
                        {"key": "Exams", "doc_count": 55},
                    ],
                },
            }
        },
    }

    expected_transformed_results = results.copy()
    expected_transformed_results["suggest"] = []
    expected_transformed_results["aggregations"][
        "resource_type"
    ] = expected_transformed_results["aggregations"]["agg_filter_resource_type"][
        "resource_type"
    ]


@pytest.mark.parametrize("podcast_present_in_aggregate", [True, False])
@pytest.mark.parametrize("userlist_present_in_aggregate", [True, False])
@pytest.mark.django_db
def test_combine_type_buckets_in_aggregates(
    podcast_present_in_aggregate, userlist_present_in_aggregate
):
    """
    transform_results should merge podcasts and podcast episodes and userlists and learning resources in the aggregate data
    """

    type_buckets = []

    if podcast_present_in_aggregate:
        type_buckets.extend(
            [
                {"key": "podcastepisode", "doc_count": 1},
                {"key": "podcast", "doc_count": 1},
            ]
        )
    else:
        type_buckets.append({"key": "podcastepisode", "doc_count": 2})

    if userlist_present_in_aggregate:
        type_buckets.extend(
            [
                {"key": "userlist", "doc_count": 2},
                {"key": "learningpath", "doc_count": 1},
            ]
        )
    else:
        type_buckets.append({"key": "learningpath", "doc_count": 3})

    results = {
        "hits": {"hits": {}, "total": {"value": 15, "relation": "eq"}},
        "suggest": {},
        "aggregations": {"type": {"buckets": type_buckets}},
    }

    assert transform_results(results, AnonymousUser(), []) == {
        "hits": {"hits": {}, "total": 15},
        "suggest": [],
        "aggregations": {
            "type": {
                "buckets": [
                    {"key": "userlist", "doc_count": 3},
                    {"key": "podcast", "doc_count": 2},
                ]
            }
        },
    }


def test_get_similar_topics(settings, opensearch):
    """Test get_similar_topics makes a query for similar document topics"""
    input_doc = {"title": "title text", "description": "description text"}

    # topic d is least popular and should not show up, order does not matter
    opensearch.conn.search.return_value = {
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

    opensearch.conn.search.assert_called_once_with(
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
        index=[f"{settings.OPENSEARCH_INDEX}_all_default"],
    )
