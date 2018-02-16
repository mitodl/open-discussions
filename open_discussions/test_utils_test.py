"""Tests for test utils"""
from open_discussions.test_utils import any_instance_of


def test_any_instance_of():
    """Tests any_instance_of()"""
    any_number = any_instance_of(int, float)

    assert any_number == 0.405
    assert any_number == 8675309
    assert any_number != 'not a number'
    assert any_number != {}
    assert any_number != []
