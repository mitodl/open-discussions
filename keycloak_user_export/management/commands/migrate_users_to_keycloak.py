from django.contrib.auth import get_user_model
import requests
import json
from django.conf import settings
from django.utils.http import urlencode
import base64
import calendar

from django.core.management import BaseCommand
from keycloak_user_export.models import UserExportToKeycloak

User = get_user_model()


class Command(BaseCommand):
    """Finds usernames that would cause conflicts after normalization"""

    help = """Finds usernames that would cause conflicts after normalization."""

    def add_arguments(self, parser):
        """parse arguments"""

        # pylint: disable=expression-not-assigned
        parser.add_argument(
            "email",
            help="Email address of the Keycloak admin user.",
        )
        parser.add_argument(
            "password",
            help="Password of the Keycloak admin user.",
        )
        parser.add_argument(
            "client_id",
            help="Client ID for the Keycloak Admin-CLI client.",
        )
        parser.add_argument(
            "client_secret",
            help="Client secret for the Keycloak Admin-CLI client.",
        )

    def get_access_token(
        self, client_id: str, email: str, password: str, client_secret: str
    ):
        url = f"{settings.KEYCLOAK_BASE_URL}/realms/{settings.KEYCLOAK_REALM_NAME}/protocol/openid-connect/token"
        payload = f"{urlencode({'client_id': client_id})}&{urlencode({'username': email})}&{urlencode({'password': password})}&grant_type=password&{urlencode({'client_secret': client_secret})}&{urlencode({'scope': 'email openid'})}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        response = requests.request("POST", url, headers=headers, data=payload)
        return response.json()["access_token"]

    def handle(self, *args, **kwargs):
        unsynced_users = (
            User.objects.only("email", "password")
            .exclude(social_auth__provider="ol-oidc")
            .exclude(userexporttokeycloak__user__isnull=False)
            .select_related("userexporttokeycloak")
            .prefetch_related("social_auth")
        )

        access_token = self.get_access_token(
            kwargs["client_id"],
            kwargs["email"],
            kwargs["password"],
            kwargs["client_secret"],
        )

        url = f"{settings.KEYCLOAK_BASE_URL}/admin/realms/{settings.KEYCLOAK_REALM_NAME}/partialImport"
        unsynced_users_array = []
        batch_size = 25
        for i in range(0, len(unsynced_users), batch_size):
            batch = unsynced_users[i : i + batch_size]
            for user in batch:
                user_keycloak_payload = {
                    "createdTimestamp": calendar.timegm(user.date_joined.timetuple()),
                    "username": user.email,
                    "enabled": True,
                    "totp": False,
                    "emailVerified": True,
                    "email": user.email,
                    "credentials": [],
                    "disableableCredentialTypes": [],
                    "requiredActions": [],
                    "realmRoles": ["default-roles-master"],
                    "notBefore": 0,
                    "groups": [],
                }
                # Protect the command in the event that a user does not have a password.
                if user.password and user.has_usable_password():
                    print(user)
                    _, iterations, salt, hash = user.password.split("$", 3)
                    base64_salt = base64.b64encode(salt.encode())
                    user_keycloak_payload["credentials"].append(
                        {
                            "secretData": json.dumps(
                                {"value": hash, "salt": base64_salt.decode()}
                            ),
                            "type": "password",
                            "credentialData": json.dumps(
                                {
                                    "hashIterations": iterations,
                                    "algorithm": "pbkdf2-sha256",
                                }
                            ),
                        }
                    )
                unsynced_users_array.append(user_keycloak_payload)
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            test_payload = json.dumps(
                {
                    "ifResourceExists": "SKIP",
                    "realm": "master",
                    "users": unsynced_users_array,
                }
            )
            response = requests.request("POST", url, headers=headers, data=test_payload)
            user_synced_with_keycloak_records = []
            keycloak_response_body = json.loads(response.content)

            # Expect the response below from Keycloak.
            # {"overwritten":0,"added":0,"skipped":1,"results":[{"action":"ADDED","resourceType":"USER","resourceName":"collinp@mit.edu","id":"b2fb40bc-5c68-4f4b-b3ab-d178cd593454"}]}
            keycloak_results = keycloak_response_body["results"]
            for user in batch:
                keycloak_response_for_user = next(
                    keycloak_result
                    for keycloak_result in keycloak_results
                    if keycloak_result["resourceName"] == user.email
                )
                if keycloak_response_for_user["action"] == "ADDED":
                    user_synced_with_keycloak_records.append(
                        UserExportToKeycloak(user=user)
                    )
            UserExportToKeycloak.objects.bulk_create(
                user_synced_with_keycloak_records, ignore_conflicts=True
            )

        print(response.text)
