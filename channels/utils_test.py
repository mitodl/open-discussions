"""Tests for utils"""
# pylint: disable=protected-access
from channels.utils import get_pagination_params, get_pagination_and_posts


def test_get_pagination_params_none(mocker):
    """Test that get_pagination_params returns no params if there are none"""
    request = mocker.Mock()
    request.query_params = {}
    assert get_pagination_params(request) == (None, None, 0)


def test_get_pagination_params_after(mocker):
    """Test that get_pagination_params extracts after params correctly"""
    request = mocker.Mock()
    request.query_params = {
        'after': 'abc',
        'count': '5'
    }
    assert get_pagination_params(request) == (None, 'abc', 5)


def test_get_pagination_params_before(mocker):
    """Test that get_pagination_params extracts before params correctly"""
    request = mocker.Mock()
    request.query_params = {
        'before': 'abc',
        'count': '5'
    }
    assert get_pagination_params(request) == ('abc', None, 5)


def test_get_pagination_and_posts_empty_page(mocker):
    """Test that we get an empty pagination and posts if there is no data"""
    posts = mocker.Mock()
    # pylint: disable=protected-access
    posts._next_batch.side_effect = StopIteration()
    assert get_pagination_and_posts(posts) == ({}, [])


def test_get_pagination_and_posts_small_page(mocker):
    """Test that we get an empty pagination and if there are less posts than page length"""
    posts = mocker.Mock()
    items = range(10)
    listing = mocker.MagicMock()
    listing.__iter__.return_value = items
    listing.after = None
    listing.before = None
    posts._listing = listing
    assert get_pagination_and_posts(posts) == ({}, list(items))
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
    assert get_pagination_and_posts(posts, before='xyz', count=26) == ({
        'after': 'def',
        'after_count': 25,
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
    assert get_pagination_and_posts(posts, before='xyz', count=51) == ({
        'before': 'abc',
        'before_count': 26,
        'after': 'def',
        'after_count': 50,
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
    assert get_pagination_and_posts(posts, count=25) == ({
        'after': 'def',
        'after_count': 50,
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
    assert get_pagination_and_posts(posts, count=25) == ({
        'before': 'abc',
        'before_count': 26,
        'after': 'def',
        'after_count': 50,
    }, list(items))
    posts._next_batch.assert_called_once_with()
