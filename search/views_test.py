"""Tests for search views"""
from django.contrib.auth.models import AnonymousUser
from django.urls import reverse
from elasticsearch.exceptions import TransportError
from rest_framework.status import HTTP_405_METHOD_NOT_ALLOWED


FAKE_SEARCH_RESPONSE = {
    "took": 1,
    "timed_out": False,
    "_shards": {"total": 10, "successful": 10, "skipped": 0, "failed": 0},
    "hits": {
        "total": 20,
        "max_score": 1.0,
        "hits": [
            {
                "_index": "discussions_local_comment_0acffefbb1984d10b73afddee53830b7",
                "_type": "_doc",
                "_id": "c_9",
                "_score": 1.0,
                "_source": {
                    "author_id": "01CH3ZD02DMXGQ19Q9JJAGPW3C",
                    "author_name": "Leah Meowmeow",
                    "text": "comment",
                    "score": 1,
                    "created": "2018-10-12T21:09:16+00:00",
                    "removed": False,
                    "deleted": False,
                    "comment_id": "9",
                    "parent_comment_id": None,
                    "object_type": "comment",
                    "channel_title": "my_mod",
                    "channel_name": "text",
                    "post_id": "1i",
                    "post_title": "a new post with title in the name",
                },
            },
            {
                "_index": "discussions_local_post_8d59996f4d594c12b1ed34b7a44024c2",
                "_type": "_doc",
                "_id": "p_1g",
                "_score": 1.0,
                "_source": {
                    "author_id": "01CMG7CXTPXVP5NQ0RDAZZMRVP",
                    "author_name": "Name",
                    "channel_name": "xaviers",
                    "channel_title": "No channel for xaviers",
                    "text": "",
                    "score": 1,
                    "created": "2018-09-11T18:58:16+00:00",
                    "num_comments": 1,
                    "removed": False,
                    "deleted": False,
                    "post_id": "1g",
                    "post_title": "new post for reporting",
                    "post_link_url": None,
                    "post_link_thumbnail": None,
                    "object_type": "post",
                },
            },
        ],
    },
}


def test_feature_flag(settings, client):
    """If the feature flag is off the url should not exist"""
    settings.FEATURES["SEARCH_UI"] = False
    resp = client.post(reverse("search"), {})
    assert resp.status_code == HTTP_405_METHOD_NOT_ALLOWED


def test_search(settings, mocker, client):
    """The query should be passed from the front end to execute_search to run the search"""
    settings.FEATURES["SEARCH_UI"] = True
    search_mock = mocker.patch(
        "search.views.execute_search", autospec=True, return_value=FAKE_SEARCH_RESPONSE
    )
    query = {"query": {"match": {"title": "Search"}}}
    resp = client.post(reverse("search"), query)
    assert resp.json() == [
        hit["_source"] for hit in FAKE_SEARCH_RESPONSE["hits"]["hits"]
    ]
    search_mock.assert_called_once_with(user=AnonymousUser(), query=query)


def test_search_es_validation(settings, mocker, client):
    """If a 4xx status is returned from Elasticsearch it should be returned from the API"""
    settings.FEATURES["SEARCH_UI"] = True
    status_code = 418
    search_mock = mocker.patch(
        "search.views.execute_search",
        autospec=True,
        side_effect=TransportError(status_code),
    )
    query = {"query": {"match": {"title": "Search"}}}
    resp = client.post(reverse("search"), query)
    assert resp.status_code == status_code
    search_mock.assert_called_once_with(user=AnonymousUser(), query=query)
