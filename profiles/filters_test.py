"""Profile/user filter tests"""
import pytest
from django.contrib.auth import get_user_model

from moira_lists.factories import MoiraListFactory
from open_discussions.factories import UserFactory, UserSocialAuthFactory
from profiles.filters import UserFilter

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_user_filter_email_endswith():
    """Verify that UserFilter's email__endswith filter works"""
    matching_user = UserFactory.create(email="user@matching.email")
    nonmatching_user = UserFactory.create(email="user@nonmatching.email")

    params = {"email__endswith": "@matching.email"}

    query = UserFilter(params, queryset=User.objects.all()).qs

    assert matching_user in query
    assert nonmatching_user not in query


@pytest.mark.parametrize(
    "social_auth_provider, user_providers, matches",
    [
        (["saml"], [], False),
        (["saml"], ["micromasters"], False),
        (["saml"], ["saml"], True),
        (["saml", "micromasters"], [], False),
        (["saml", "micromasters"], ["saml"], True),
        (["saml", "micromasters"], ["micromasters"], True),
        (["saml", "micromasters"], ["saml", "micromasters"], True),
    ],
)
def test_user_filter_social_auth_name(social_auth_provider, user_providers, matches):
    """Verify that UserFilter's email__endswith filter works"""
    matching_user = UserFactory.create()
    nonmatching_user = UserFactory.create()

    for provider in user_providers:
        UserSocialAuthFactory.create(
            user=matching_user, provider=provider, uid=matching_user.email
        )

    params = {"social_auth_provider": social_auth_provider}

    query = UserFilter(params, queryset=User.objects.all()).qs

    if matches:
        assert matching_user in query
    else:
        assert matching_user not in query
    assert nonmatching_user not in query


def test_user_filter_moira_lists():
    """Verify that UserFilter's moira_lists filter works"""
    matching_user = UserFactory.create()
    nonmatching_user = UserFactory.create()

    moira_list = MoiraListFactory.create()
    moira_list.users.add(matching_user)

    query = UserFilter(
        {"moira_lists": [moira_list.name]}, queryset=User.objects.all()
    ).qs

    assert matching_user in query
    assert nonmatching_user not in query


@pytest.mark.parametrize("moira_list", [None, "moira-list-1"])
@pytest.mark.parametrize("email", [None, "@matching.domain"])
@pytest.mark.parametrize(
    "social_auth_provider", [None, ["saml"], ["micromasters"], ["saml", "micromasters"]]
)
def test_user_filter_filter_combos(email, social_auth_provider, moira_list):
    """Verify that UserFilter works for combinations of filters"""
    if social_auth_provider is None and email is None:
        pytest.skip("Invalid combination")

    matching_user = UserFactory.create(email="user@matching.domain")
    nonmatching_user = UserFactory.create()

    params = {}

    if moira_list:
        moira_list = MoiraListFactory.create(name=moira_list)
        moira_list.users.add(matching_user)
        params["moira_lists"] = [moira_list]

    if email:
        params["email__endswith"] = email

    if social_auth_provider:
        params["social_auth_provider"] = social_auth_provider

        # for each provider create a matching user
        for provider in social_auth_provider:
            UserSocialAuthFactory.create(
                user=matching_user, provider=provider, uid=matching_user.email
            )

    query = UserFilter(params, queryset=User.objects.all()).qs

    assert matching_user in query
    assert nonmatching_user not in query
