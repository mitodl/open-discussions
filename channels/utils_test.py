"""Tests for utils"""
# pylint: disable=protected-access
import pytest

from channels.constants import (
    POSTS_SORT_HOT,
    VALID_POST_SORT_TYPES,
)
from channels.utils import (
    ListingParams,
    DEFAULT_LISTING_PARAMS,
    get_listing_params,
    get_pagination_and_posts,
)


def test_get_listing_params_none(mocker):
    """Test that get_listing_params returns no params if there are none"""
    request = mocker.Mock()
    request.query_params = {}
    assert get_listing_params(request) == DEFAULT_LISTING_PARAMS


def test_get_listing_params_after(mocker):
    """Test that get_listing_params extracts after params correctly"""
    request = mocker.Mock()
    request.query_params = {
        'after': 'abc',
        'count': '5'
    }
    assert get_listing_params(request) == ListingParams(None, 'abc', 5, POSTS_SORT_HOT)


def test_get_listing_params_before(mocker):
    """Test that get_listing_params extracts before params correctly"""
    request = mocker.Mock()
    request.query_params = {
        'before': 'abc',
        'count': '5'
    }
    assert get_listing_params(request) == ListingParams('abc', None, 5, POSTS_SORT_HOT)


@pytest.mark.parametrize('sort', VALID_POST_SORT_TYPES)
def test_get_listing_params_sort(mocker, sort):
    """Test that get_listing_params extracts before params correctly"""
    request = mocker.Mock()
    request.query_params = {'sort': sort}
    assert get_listing_params(request) == ListingParams(None, None, 0, sort)


def test_get_pagination_and_posts_empty_page(mocker):
    """Test that we get an empty pagination and posts if there is no data"""
    posts = mocker.Mock()
    # pylint: disable=protected-access
    posts._next_batch.side_effect = StopIteration()
    assert get_pagination_and_posts(posts, DEFAULT_LISTING_PARAMS) == ({
        'sort': POSTS_SORT_HOT,
    }, [])


def test_get_pagination_and_posts_small_page(mocker):
    """Test that we get an empty pagination and if there are less posts than page length"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = None
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(posts, DEFAULT_LISTING_PARAMS) == ({
        'sort': POSTS_SORT_HOT,
    }, list(items))
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_before_first_page(mocker):
    """Test that we get an pagination with before to the first page"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = 'def'
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(posts, ListingParams('xyz', None, 26, POSTS_SORT_HOT)) == ({
        'after': 'def',
        'after_count': 25,
        'sort': POSTS_SORT_HOT,
    }, list(items))
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_before_second_page(mocker):
    """Test that we get an pagination with before that's the second page"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = 'def'
    listing.before = 'abc'
    posts._listing = listing
    assert get_pagination_and_posts(posts, ListingParams('xyz', None, 51, POSTS_SORT_HOT)) == ({
        'before': 'abc',
        'before_count': 26,
        'after': 'def',
        'after_count': 50,
        'sort': POSTS_SORT_HOT,
    }, list(items))
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_after(mocker):
    """Test that we get an pagination with after"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = 'def'
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(posts, ListingParams(None, None, 25, POSTS_SORT_HOT)) == ({
        'after': 'def',
        'after_count': 50,
        'sort': POSTS_SORT_HOT,
    }, list(items))
    posts._next_batch.assert_called_once_with()


def test_get_pagination_and_posts_before_and_after(mocker):
    """Test that we get an pagination with before and after"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = 'def'
    listing.before = 'abc'
    posts._listing = listing
    assert get_pagination_and_posts(posts, ListingParams(None, None, 25, POSTS_SORT_HOT)) == ({
        'before': 'abc',
        'before_count': 26,
        'after': 'def',
        'after_count': 50,
        'sort': POSTS_SORT_HOT,
    }, list(items))
    posts._next_batch.assert_called_once_with()
