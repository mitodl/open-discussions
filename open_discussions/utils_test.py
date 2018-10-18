"""Utils tests"""
import datetime
from math import ceil

import pytest
import pytz

from open_discussions.utils import (
    now_in_utc,
    is_near_now,
    normalize_to_start_of_day,
    chunks,
    merge_strings,
    filter_dict_keys,
    filter_dict_with_renamed_keys,
)


def test_now_in_utc():
    """now_in_utc() should return the current time set to the UTC time zone"""
    now = now_in_utc()
    assert is_near_now(now)
    assert now.tzinfo == pytz.UTC


def test_is_near_now():
    """
    Test is_near_now for now
    """
    now = datetime.datetime.now(tz=pytz.UTC)
    assert is_near_now(now) is True
    later = now + datetime.timedelta(0, 6)
    assert is_near_now(later) is False
    earlier = now - datetime.timedelta(0, 6)
    assert is_near_now(earlier) is False


def test_normalize_to_start_of_day():
    """
    Test that normalize_to_start_of_day zeroes out the time components
    """
    assert normalize_to_start_of_day(
        datetime.datetime(2018, 1, 3, 5, 6, 7)
    ) == datetime.datetime(2018, 1, 3)


def test_chunks():
    """
    test for chunks
    """
    input_list = list(range(113))
    output_list = []
    for nums in chunks(input_list):
        output_list += nums
    assert output_list == input_list

    output_list = []
    for nums in chunks(input_list, chunk_size=1):
        output_list += nums
    assert output_list == input_list

    output_list = []
    for nums in chunks(input_list, chunk_size=124):
        output_list += nums
    assert output_list == input_list


def test_chunks_iterable():
    """
    test that chunks works on non-list iterables too
    """
    count = 113
    input_range = range(count)
    chunk_output = []
    for chunk in chunks(input_range, chunk_size=10):
        chunk_output.append(chunk)
    assert len(chunk_output) == ceil(113 / 10)

    range_list = []
    for chunk in chunk_output:
        range_list += chunk
    assert range_list == list(range(count))


@pytest.mark.parametrize(
    "list_or_string,output",
    [
        ["str", ["str"]],
        [["str", None, [None]], ["str"]],
        [[["a"], "b", ["c", "d"], "e"], ["a", "b", "c", "d", "e"]],
    ],
)
def test_merge_strings(list_or_string, output):
    """
    merge_strings should flatten a nested list of strings
    """
    assert merge_strings(list_or_string) == output


def test_filter_dict_keys():
    """filter_dict_keys should return a dict with only the specified list of keys"""
    d = {"a": 1, "b": 2, "c": 3, "d": 4}
    assert filter_dict_keys(d, ["b", "d"]) == {"b": 2, "d": 4}

    with pytest.raises(KeyError):
        assert filter_dict_keys(d, ["b", "missing"])

    assert filter_dict_keys(d, ["b", "missing"], optional=True) == {"b": 2}


def test_filter_dict_with_renamed_keys():
    """
    filter_dict_with_renamed_keys should return a dict with only the keys in a filter dict,
    and should rename those keys according to the values in the filter dict.
    """
    d = {"a": 1, "b": 2, "c": 3, "d": 4}
    assert filter_dict_with_renamed_keys(d, {"b": "b1", "d": "d1"}) == {
        "b1": 2,
        "d1": 4,
    }

    with pytest.raises(KeyError):
        assert filter_dict_with_renamed_keys(d, {"b": "b1", "missing": "d1"})

    assert filter_dict_with_renamed_keys(
        d, {"b": "b1", "missing": "d1"}, optional=True
    ) == {"b1": 2}
