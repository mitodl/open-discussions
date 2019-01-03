"""Tests for utils"""
# pylint: disable=protected-access
from unittest.mock import Mock

import pytest
from praw.exceptions import APIException
from prawcore.exceptions import Forbidden, NotFound as PrawNotFound, Redirect
from rest_framework.exceptions import NotAuthenticated, NotFound, PermissionDenied

from channels.constants import POSTS_SORT_HOT, VALID_POST_SORT_TYPES
from channels.exceptions import ConflictException, GoneException
from channels.utils import (
    ListingParams,
    DEFAULT_LISTING_PARAMS,
    get_listing_params,
    get_pagination_and_posts,
    translate_praw_exceptions,
    get_reddit_slug,
    get_kind_and_id,
    num_items_not_none,
    render_article_text,
)


def test_get_listing_params_none(mocker):
    """Test that get_listing_params returns no params if there are none"""
    request = mocker.Mock()
    request.query_params = {}
    assert get_listing_params(request) == DEFAULT_LISTING_PARAMS


def test_get_listing_params_after(mocker):
    """Test that get_listing_params extracts after params correctly"""
    request = mocker.Mock()
    request.query_params = {"after": "abc", "count": "5"}
    assert get_listing_params(request) == ListingParams(None, "abc", 5, POSTS_SORT_HOT)


def test_get_listing_params_before(mocker):
    """Test that get_listing_params extracts before params correctly"""
    request = mocker.Mock()
    request.query_params = {"before": "abc", "count": "5"}
    assert get_listing_params(request) == ListingParams("abc", None, 5, POSTS_SORT_HOT)


@pytest.mark.parametrize("sort", VALID_POST_SORT_TYPES)
def test_get_listing_params_sort(mocker, sort):
    """Test that get_listing_params extracts before params correctly"""
    request = mocker.Mock()
    request.query_params = {"sort": sort}
    assert get_listing_params(request) == ListingParams(None, None, 0, sort)


def test_get_pagination_and_posts_empty_page(mocker):
    """Test that we get an empty pagination and posts if there is no data"""
    posts = mocker.Mock()
    # pylint: disable=protected-access
    posts._next_batch.side_effect = StopIteration()
    assert get_pagination_and_posts(posts, DEFAULT_LISTING_PARAMS) == (
        {"sort": POSTS_SORT_HOT},
        [],
    )


def test_get_pagination_and_posts_small_page(mocker):
    """Test that we get an empty pagination and if there are less posts than page length"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = None
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(posts, DEFAULT_LISTING_PARAMS) == (
        {"sort": POSTS_SORT_HOT},
        list(items),
    )
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_before_first_page(mocker):
    """Test that we get an pagination with before to the first page"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = "def"
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(
        posts, ListingParams("xyz", None, 26, POSTS_SORT_HOT)
    ) == ({"after": "def", "after_count": 25, "sort": POSTS_SORT_HOT}, list(items))
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_before_second_page(mocker):
    """Test that we get an pagination with before that's the second page"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = "def"
    listing.before = "abc"
    posts._listing = listing
    assert get_pagination_and_posts(
        posts, ListingParams("xyz", None, 51, POSTS_SORT_HOT)
    ) == (
        {
            "before": "abc",
            "before_count": 26,
            "after": "def",
            "after_count": 50,
            "sort": POSTS_SORT_HOT,
        },
        list(items),
    )
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_after(mocker):
    """Test that we get an pagination with after"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = "def"
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(
        posts, ListingParams(None, None, 25, POSTS_SORT_HOT)
    ) == ({"after": "def", "after_count": 50, "sort": POSTS_SORT_HOT}, list(items))
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_before_and_after(mocker):
    """Test that we get an pagination with before and after"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = "def"
    listing.before = "abc"
    posts._listing = listing
    assert get_pagination_and_posts(
        posts, ListingParams(None, None, 25, POSTS_SORT_HOT)
    ) == (
        {
            "before": "abc",
            "before_count": 26,
            "after": "def",
            "after_count": 50,
            "sort": POSTS_SORT_HOT,
        },
        list(items),
    )
    posts._next_batch.assert_called_once_with()


@pytest.mark.parametrize(
    "raised_exception,is_anonymous,expected_exception",
    [
        [None, False, None],
        [Forbidden(Mock(status_code=403)), True, NotAuthenticated],
        [Forbidden(Mock(status_code=403)), False, PermissionDenied],
        [PrawNotFound(Mock()), False, NotFound],
        [Redirect(Mock(headers={"location": "http://example.com"})), False, NotFound],
        [APIException("SUBREDDIT_NOTALLOWED", "msg", "field"), False, PermissionDenied],
        [APIException("NOT_AUTHOR", "msg", "field"), False, PermissionDenied],
        [APIException("SUBREDDIT_NOEXIST", "msg", "field"), False, NotFound],
        [APIException("SUBREDDIT_EXISTS", "msg", "field"), False, ConflictException],
        [APIException("DELETED_COMMENT", "msg", "field"), False, GoneException],
        [KeyError(), False, KeyError],
    ],
)
def test_translate_praw_exceptions(raised_exception, is_anonymous, expected_exception):
    """Test that exceptions are translated correctly"""
    user = Mock(is_anonymous=is_anonymous)

    if expected_exception is None:
        with translate_praw_exceptions(user):
            if raised_exception is not None:
                raise raised_exception

    else:
        with pytest.raises(expected_exception):
            with translate_praw_exceptions(user):
                if raised_exception is not None:
                    raise raised_exception


@pytest.mark.parametrize(
    "permalink,slug",
    [
        ["/r/1511374327_magnam/comments/ea/text_post/", "text-post"],
        ["/r/1511371168_mollitia/comments/e6/url_post", "url-post"],
    ],
)
def test_get_reddit_slug(permalink, slug):
    """Test that the correct slug is retrieved from a permalink"""
    assert get_reddit_slug(permalink) == slug


def test_kind_and_id():
    """Test that get_kind_and_id correctly splits the string"""
    assert get_kind_and_id("t3_anbj_gu") == ["t3", "anbj_gu"]


def test_num_items_not_none():
    """Test that num_items_not_none returns expected results"""
    assert num_items_not_none([]) == 0
    assert num_items_not_none([None, None]) == 0

    assert num_items_not_none([1]) == 1
    assert num_items_not_none([None, 1]) == 1
    assert num_items_not_none([1, None]) == 1

    assert num_items_not_none([0, 1, "", "abc", False, True, None]) == 6


@pytest.mark.parametrize(
    "input_node,output_text",
    [
        [{"text": " some text "}, " some text "],
        [[{"text": "first part "}, {"text": "second part"}], "first part second part"],
        [
            {
                "name": "p",
                "children": [{"text": "child text he"}, {"text": "re some more text."}],
            },
            " child text here some more text. ",
        ],
        [{"name": "li", "text": "item in a bullet point"}, " item in a bullet point "],
        [{"name": "td", "text": "item in a cell"}, " item in a cell "],
        [{"name": "figcaption", "text": "item in a caption"}, " item in a caption "],
    ],
)
def test_render_article_text(input_node, output_text):
    """render_article_text should extract the text from any arbitrary article node tree"""
    assert render_article_text(input_node) == output_text
