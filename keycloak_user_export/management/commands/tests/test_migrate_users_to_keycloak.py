import json

from django.contrib.auth import get_user_model
from django.core.management import call_command
import pytest
import responses

from keycloak_user_export.models import UserExportToKeycloak
from open_discussions.factories import UserFactory


pytestmark = [pytest.mark.usefixtures("mocked_responses"), pytest.mark.django_db]

User = get_user_model()


@pytest.fixture(autouse=True)
def kc_settings(settings):
    settings.KEYCLOAK_BASE_URL = "http://keycloak.mocked/"
    settings.KEYCLOAK_REALM_NAME = "pytest-realm"


def test_migrate_users_to_keycloak(mocked_responses):
    """Test that the migrate_users_to_keycloak command functions as expected"""
    users = UserFactory.create_batch(100)
    inactive_users = UserFactory.create_batch(10, is_active=False)
    already_synced = users[:20]

    UserExportToKeycloak.objects.bulk_create(
        [UserExportToKeycloak(user=user) for user in already_synced]
    )

    mocked_responses.add(
        responses.POST,
        url="http://keycloak.mocked/realms/pytest-realm/protocol/openid-connect/token",
        json={"access_token": "abc123"},
        status=200,
    )

    import_req_num = 0

    def partial_import_callback(request):
        nonlocal import_req_num

        data = json.loads(request.body)

        import_req_num += 1

        if import_req_num % 3 == 0:
            return (401, {}, "")

        assert data["ifResourceExists"] == "SKIP"
        assert data["realm"] == "pytest-realm"

        response = {
            "results": [
                {"action": "ADDED", "resourceName": user["email"]}
                for user in data["users"]
            ]
        }

        return (200, {}, json.dumps(response))

    mocked_responses.add_callback(
        responses.POST,
        url="http://keycloak.mocked//admin/realms/pytest-realm/partialImport",
        callback=partial_import_callback,
        content_type="application/json",
    )

    call_command(
        "migrate_users_to_keycloak",
        "--client-id=test-client-id",
        "--client-secret=test-client-secret",
    )

    assert (
        list(User.objects.filter(userexporttokeycloak__isnull=False).order_by("id"))
        == users
    )
    assert (
        list(User.objects.filter(userexporttokeycloak__isnull=True).order_by("id"))
        == inactive_users
    )
