"""Invite pipeline tests"""
import pytest

from authentication.pipeline import invite as invite_actions
from channels.factories.models import ChannelInvitationFactory


@pytest.mark.parametrize("is_new", [True, False])
@pytest.mark.parametrize("num_invites", [0, 1, 3])
def test_resolve_outstanding_channel_invites(mocker, user, is_new, num_invites):
    """Tests that we get a username for a new user"""
    invites = (
        ChannelInvitationFactory.create_batch(num_invites, email=user.email)
        if num_invites
        else []
    )
    mock_get_admin_api = mocker.patch(
        "authentication.pipeline.invite.get_admin_api", spec=True
    )

    assert (
        invite_actions.resolve_outstanding_channel_invites(
            None, None, user=user, is_new=is_new
        )
        == {}
    )

    for invite in invites:
        invite.refresh_from_db()

    mock_api = mock_get_admin_api.return_value

    if is_new:
        mock_get_admin_api.assert_called_once_with()

        assert mock_api.add_contributor.call_count == num_invites
        assert mock_api.add_subscriber.call_count == num_invites

        for invite in invites:
            mock_api.add_contributor.assert_any_call(user.username, invite.channel.name)
            mock_api.add_subscriber.assert_any_call(user.username, invite.channel.name)

            assert invite.user == user
            assert invite.redeemed is True
    else:
        mock_get_admin_api.assert_not_called()

        for invite in invites:
            assert invite.user is None
            assert invite.redeemed is False


@pytest.mark.parametrize("failing_method", ["add_contributor", "add_subscriber"])
def test_resolve_outstanding_channel_invites_rollback_on_error(
    mocker, user, failing_method
):
    """Tests that we get a username for a new user"""
    invites = ChannelInvitationFactory.create_batch(5, email=user.email)

    mock_get_admin_api = mocker.patch(
        "authentication.pipeline.invite.get_admin_api", spec=True
    )
    mock_api = mock_get_admin_api.return_value
    getattr(mock_api, failing_method).side_effect = Exception("error")

    with pytest.raises(Exception):
        invite_actions.resolve_outstanding_channel_invites(
            None, None, user=user, is_new=True
        )

    mock_get_admin_api.assert_called_once_with()

    for invite in invites:
        invite.refresh_from_db()

        assert invite.user is None
        assert invite.redeemed is False
