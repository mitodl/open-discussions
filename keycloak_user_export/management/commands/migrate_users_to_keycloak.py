from django.contrib.auth import get_user_model
import requests
import json
from django.conf import settings
from django.utils.http import urlencode
import base64
import calendar

from django.core.management import BaseCommand, CommandError
from keycloak_user_export.models import UserExportToKeycloak

User = get_user_model()


class Command(BaseCommand):
    """
    Creates Keycloak user records for all Django user records which have a password set
    and no associated social-auth record for the "ol-oidc" provider.  The Keycloak user
    record is populated with the Django user's first_name, last_name, email, and password.

    Keycloak users are created in the realm defined by the `KEYCLOAK_REALM_NAME`
    environment variable.

    The `KEYCLOAK_BASE_URL` environment variable must be defined and equal to the
    base URL of the Keycloak instance.

    This command assumes Django users are defined with the default Django User model (first_name, last_name, email, password).

    A UserExportToKeycloak record is created for each successfully exported user.  If a UserExportToKeycloak
    already exists for a user, no duplicate UserExportToKeycloak record will be created.

    Django users are not exported if a Keycloak user with the same email address as the Django user
    already exists.
    """

    help = """
    Creates Keycloak user records for all Django user records which have a password set
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

    def _get_access_token(
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

    def _generate_keycloak_user_payload(self, user):
        """
        Returns a dictionary formatted as the expected user representation for the
        Keycloak partialImport Admin REST API endpoint.
        The dictionary will include credential data if the user has a password
        defined.

        Args:
            user (models.User): A Django User model record.

        Returns:
            dict: user representation for use with the Keycloak partialImport Admin REST API endpoint.
        """
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
        return user_keycloak_payload

    def _verify_environment_variables_configured(self):
        """
        Verify that KEYCLOAK_BASE_URL and KEYCLOAK_REALM_NAME are configured as environment
        variables.

        Raises:
            CommandError: KEYCLOAK_BASE_URL must be defined as an environment variable.
            CommandError: KEYCLOAK_REALM_NAME must be defined as an environment variable.
        """
        if getattr(settings, "KEYCLOAK_BASE_URL", None) is None:
            raise CommandError(
                "KEYCLOAK_BASE_URL must be defined as an environment variable."
            )

        if getattr(settings, "KEYCLOAK_REALM_NAME", None) is None:
            raise CommandError(
                "KEYCLOAK_REALM_NAME must be defined as an environment variable."
            )

    def handle(self, *args, **kwargs):
        self._verify_environment_variables_configured()

        keycloak_partial_import_url = f"{settings.KEYCLOAK_BASE_URL}/admin/realms/{settings.KEYCLOAK_REALM_NAME}/partialImport"

        unsynced_users = (
            User.objects.only("email", "password")
            .exclude(social_auth__provider="ol-oidc")
            .exclude(userexporttokeycloak__isnull=False)
            .select_related("userexporttokeycloak")
            .prefetch_related("social_auth")
        )

        access_token = self._get_access_token(
            kwargs["client_id"],
            kwargs["email"],
            kwargs["password"],
            kwargs["client_secret"],
        )

        unsynced_users_keycloak_payload_array = []

        # Process batches of the users who must be exported.
        batch_size = kwargs["batchsize"]
        for i in range(0, len(unsynced_users), batch_size):
            batch = unsynced_users[i : i + batch_size]
            for user in batch:
                unsynced_users_keycloak_payload_array.append(
                    self._generate_keycloak_user_payload(user)
                )
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            payload = json.dumps(
                {
                    "ifResourceExists": "SKIP",
                    "realm": settings.KEYCLOAK_REALM_NAME,
                    "users": unsynced_users_keycloak_payload_array,
                }
            )
            response = requests.request(
                "POST", keycloak_partial_import_url, headers=headers, data=payload
            )
            # If Keycloak responds with a 401, refresh the access_token and retry once.
            if response.status_code == 401:
                access_token = self._get_access_token(
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
                    "POST", keycloak_partial_import_url, headers=headers, data=payload
                )

            # If the response from Keycloak is not 200, print out an error and move on to
            # the next batch of users to export.
            if response.status_code != 200:
                print(f"Error calling Keycloak REST API, returned {response.content}")
            else:
                user_synced_with_keycloak_records = []
                keycloak_response_body = json.loads(response.content)

                # Expect the response below from Keycloak.
                # {"overwritten":0,"added":0,"skipped":1,"results":[{"action":"ADDED","resourceType":"USER","resourceName":"collinp@mit.edu","id":"b2fb40bc-5c68-4f4b-b3ab-d178cd593454"}]}
                keycloak_results = keycloak_response_body["results"]
                # Convert the keycloak_results to a dictionary using the user email as the key.
                keycloak_results_email_key_dict = {
                    item["resourceName"]: item for item in keycloak_results
                }
                for user in batch:
                    if keycloak_results_email_key_dict[user.email]["action"] == "ADDED":
                        user_synced_with_keycloak_records.append(
                            UserExportToKeycloak(user=user)
                        )
                UserExportToKeycloak.objects.bulk_create(
                    user_synced_with_keycloak_records, ignore_conflicts=True
                )
