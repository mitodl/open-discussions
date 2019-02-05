# pylint: disable=redefined-outer-name
"""Tests for search views"""
from types import SimpleNamespace
import pytest
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


@pytest.fixture()
def search_view(settings):
    """Fixture with relevant properties for testing the search view"""
    settings.FEATURES["SEARCH_UI"] = True
    return SimpleNamespace(url=reverse("search"))


@pytest.fixture()
def related_posts_view(settings):
    """Fixture with relevant properties for testing the related posts view"""
    settings.FEATURES["RELATED_POSTS_UI"] = True
    post_id = "abc"
    return SimpleNamespace(
        url=reverse("related-posts", kwargs={"post_id": post_id}), post_id=post_id
    )


def test_search_es_exception(mocker, client, search_view):
    """If a 4xx status is returned from Elasticsearch it should be returned from the API"""
    status_code = 418
    search_mock = mocker.patch(
        "search.views.execute_search",
        autospec=True,
        side_effect=TransportError(status_code),
    )
    query = {"query": {"match": {"title": "Search"}}}
    resp = client.post(search_view.url, query)
    assert resp.status_code == status_code
    search_mock.assert_called_once_with(user=AnonymousUser(), query=query)


def test_related_posts_es_exception(mocker, client, related_posts_view):
    """If a 4xx status is returned from Elasticsearch it should be returned from the API"""
    status_code = 418
    related_documents_mock = mocker.patch(
        "search.views.find_related_documents",
        autospec=True,
        side_effect=TransportError(status_code),
    )
    resp = client.post(related_posts_view.url)
    assert resp.status_code == status_code
    related_documents_mock.assert_called_once_with(
        user=AnonymousUser(), post_id=related_posts_view.post_id
    )


def test_search_feature_flag(settings, client, search_view):
    """If the feature flag is off the url should not exist"""
    settings.FEATURES["SEARCH_UI"] = False
    resp = client.post(search_view.url, {})
    assert resp.status_code == HTTP_405_METHOD_NOT_ALLOWED


def test_search(mocker, client, search_view):
    """The query should be passed from the front end to execute_search to run the search"""
    search_mock = mocker.patch(
        "search.views.execute_search", autospec=True, return_value=FAKE_SEARCH_RESPONSE
    )
    query = {"query": {"match": {"title": "Search"}}}
    resp = client.post(search_view.url, query)
    assert resp.json() == FAKE_SEARCH_RESPONSE
    search_mock.assert_called_once_with(user=AnonymousUser(), query=query)


def test_find_related_documents(mocker, client, related_posts_view):
    """The view should return the results of the API method for finding related posts"""
    fake_response = {"related": "posts"}
    related_documents_mock = mocker.patch(
        "search.views.find_related_documents", autospec=True, return_value=fake_response
    )
    resp = client.post(related_posts_view.url)
    assert resp.json() == fake_response
    related_documents_mock.assert_called_once_with(
        user=AnonymousUser(), post_id=related_posts_view.post_id
    )


def test_find_related_documents_feature_flag(settings, client, related_posts_view):
    """If the feature flag is off the url should not exist"""
    settings.FEATURES["RELATED_POSTS_UI"] = False
    resp = client.post(related_posts_view.url)
    assert resp.status_code == HTTP_405_METHOD_NOT_ALLOWED
