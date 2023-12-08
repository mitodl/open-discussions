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
    """
    Creates a Keycloak user record for all Django user records which have a password set
    and no associated social-auth record for the "ol-oidc" provider.  The Keycloak user
    record is populated with the Django user's first_name, last_name, email, and password.

    Keycloak users are created in the realm defined by the `KEYCLOAK_REALM_NAME`
    environment variable.

    The `KEYCLOAK_BASE_URL` environment variable must be defined and equal to the
    base URL of the Keycloak instance.

    This command assumes the use of the default Django User model (first_name, last_name, email, password).

    A UserExportToKeycloak record is created for each successfully exported user.  If a UserExportToKeycloak
    already exists for a user, no duplicate UserExportToKeycloak record will be created.

    Django users are not exported if a Keycloak user with the same email address as the Django user
    already exists.
    """

    help = """
    Creates a Keycloak user record for all user records which have a password set
    and no associated social-auth record for the "ol-oidc" provider.
    Keycloak users are created in the realm defined by the `KEYCLOAK_REALM_NAME`
    environment variable.
    The `KEYCLOAK_BASE_URL` environment variable must be defined and equal to the
    base URL of the Keycloak instance.
    """

    def add_arguments(self, parser):
        """parse arguments"""

        # pylint: disable=expression-not-assigned
        parser.add_argument(
            "email",
            help="Email address of a Keycloak realm admin user.",
        )
        parser.add_argument(
            "password",
            help="Password of a Keycloak realm admin user.",
        )
        parser.add_argument(
            "client_id",
            help="Client ID for the Keycloak Admin-CLI client.",
        )
        parser.add_argument(
            "client_secret",
            help="Client secret for the Keycloak Admin-CLI client.",
        )
        parser.add_argument(
            "--batchsize",
            nargs="?",
            default=25,
            type=int,
            help="(Optional) How many users to export to Keycloak at a time.",
        )

    def get_access_token(
        self, client_id: str, email: str, password: str, client_secret: str
    ):
        """
        Creates a new access token for a Keycloak realm administrator for use with the admin-cli client.

        Args:
            client_id (str): The client_ID associated with Keycloak's admin-cli client.
            email (str): The email address of a Keycloak realm administrator user.
            password (str): The password associated with the email address for a Keycloak realm administrator user.
            client_secret (str): The client secret associated with Keycloak's admin-cli client.

        Returns:
            A new access_token for the administrator user for use with the Keycloak admin-cli client.
        """
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

        # Process batches of the users who must be exported.
        batch_size = kwargs["batchsize"]
        for i in range(0, len(unsynced_users), batch_size):
            batch = unsynced_users[i : i + batch_size]
            for user in batch:
                user_keycloak_payload = {
                    "createdTimestamp": calendar.timegm(user.date_joined.timetuple()),
                    "username": user.email,
                    "firstName": user.first_name,
                    "lastName": user.last_name,
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
                # If the user has a password defined, we will create a credential for them in Keycloak.
                # This allows the user to
                if user.password and user.has_usable_password():
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
            # If Keycloak responds with a 401, refresh the access_token and retry once.
            if response.status_code == 401:
                access_token = self.get_access_token(
                    kwargs["client_id"],
                    kwargs["email"],
                    kwargs["password"],
                    kwargs["client_secret"],
                )
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}",
                }
                response = requests.request(
                    "POST", url, headers=headers, data=test_payload
                )

            # If the response from Keycloak is not 200, print out an error and move on to
            # the next batch of users to export.
            if response.status_code != 200:
                print(
                    f"Error calling Keycloak REST API, returned {response.status_code}"
                )
            else:
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
