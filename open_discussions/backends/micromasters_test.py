"""Tests for MicroMastersAuth"""
from open_discussions.backends.micromasters import MicroMastersAuth


def test_auth_url(mocker):
    """Tests that it respects the settings value"""
    mock_strategy = mocker.Mock()
    auth = MicroMastersAuth(mock_strategy)
    assert auth.auth_url() == mock_strategy.setting.return_value
