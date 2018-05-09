""" Tests for profile permissions """
import pytest

from open_discussions.factories import UserFactory
from profiles.permissions import HasEditPermission


def test_can_edit_profile_staff(mocker, staff_jwt_token, user):
    """
    Test that staff users are allowed to view/edit profiles
    """
    request = mocker.Mock(auth=staff_jwt_token, user=user)
    profile = user.profile
    assert HasEditPermission().has_permission(request, mocker.Mock()) is True
    assert HasEditPermission().has_object_permission(request, mocker.Mock(), profile) is True


@pytest.mark.parametrize('method,result', [
    ('GET', True),
    ('HEAD', True),
    ('OPTIONS', True),
    ('POST', False),
    ('PUT', False),
])
@pytest.mark.parametrize('is_super', [True, False])  # pylint: disable=too-many-arguments
def test_can_edit_other_profile(mocker, method, result, jwt_token, user, is_super):
    """
    Test that staff users are not allowed to edit another user's profile
    """
    request = mocker.Mock(auth=jwt_token, user=user, method=method)
    profile = UserFactory.create(is_superuser=is_super).profile
    assert HasEditPermission().has_object_permission(request, mocker.Mock(), profile) is result or is_super


@pytest.mark.parametrize('method', ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'])
def test_can_edit_own_profile(mocker, method, jwt_token, user):
    """
    Test that users are allowed to edit their own profile
    """
    request = mocker.Mock(auth=jwt_token, user=user, method=method)
    profile = user.profile
    assert HasEditPermission().has_object_permission(request, mocker.Mock(), profile) is True
