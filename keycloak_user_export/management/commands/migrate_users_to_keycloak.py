from django.contrib.auth import get_user_model
import requests
import json
from django.conf import settings
from django.utils.http import urlencode
import calendar
from django.db.models import Q

from django.core.management import BaseCommand, CommandError
from keycloak_user_export.models import UserExportToKeycloak

User = get_user_model()


class Command(BaseCommand):
    """
    Creates Keycloak user records for all Django user records which have no associated
    social-auth record for the "ol-oidc" provider.  The Keycloak user
    record is populated with the Django user's first_name, last_name, and email.

    Optionally, the "--filter_provider_name" argument can be defined (string) when running this script.
    If defined, Keycoak user records will be created only for Django user records which have no associated
    social-auth record for the "ol-oidc" provider, and have a social-auth record with a provider
    equal to the argument value.

    Optionally, the "--keycloak_group_path" argument can be defined (string) when running this script
    which will add all created Keycloak users to the Keycloak group path defined as the
    argument value.  For example, "--keycloak_group_path=/imported/open-discussions/touchstone".
    If the argument is defined, the Keycloak group path must exist prior to executing this script.

    Optionally, the "--batch_size" argument can be defined (int) when running this script.
    The value of this argument controls how many Keycloak user records should be created
    with each API request made to Keycloak.  The default is 25.

    Keycloak users are created in the realm defined by the `KEYCLOAK_REALM_NAME`
    environment variable.

    The `KEYCLOAK_BASE_URL` environment variable must be defined and equal to the
    base URL of the Keycloak instance.

    This command assumes Django users are defined with the default Django User model (first_name, last_name, email).

    A UserExportToKeycloak record is created for each successfully exported user.  If a UserExportToKeycloak
    already exists for a user, no duplicate UserExportToKeycloak record will be created.

    Django users are not exported if a Keycloak user with the same email address as the Django user
    already exists.
    """

    help = """
    Creates Keycloak user records for all Django user records which have
    no associated social-auth record for the "ol-oidc" provider.
    Keycloak users are created in the realm defined by the `KEYCLOAK_REALM_NAME`
    environment variable.
    The `KEYCLOAK_BASE_URL` environment variable must be defined and equal to the
    base URL of the Keycloak instance.
    """

    def add_arguments(self, parser):
        """parse arguments"""

        # pylint: disable=expression-not-assigned
        parser.add_argument(
            "username",
            help="Username of a Keycloak realm admin user.",
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
            "--batch_size",
            nargs="?",
            default=25,
            type=int,
            help="(Optional) How many users to export to Keycloak at a time.",
        )
        parser.add_argument(
            "--keycloak_group_path",
            nargs="?",
            default="",
            type=str,
            help="(Optional) The Keycloak group's path users should will added to.",
        )
        parser.add_argument(
            "--filter_provider_name",
            nargs="?",
            default=None,
            type=str,
            help="(Optional) Only create Keycloak users for Django user records associated with a specific social-auth provider.",
        )

    def _get_access_token(
        self, client_id: str, username: str, password: str, client_secret: str
    ):
        """
        Creates a new access token for a Keycloak realm administrator for use with the admin-cli client.

        Args:
            client_id (str): The client_ID associated with Keycloak's admin-cli client.
            username (str): The username of a Keycloak realm administrator user.
            password (str): The password associated with the username for a Keycloak realm administrator user.
            client_secret (str): The client secret associated with Keycloak's admin-cli client.

        Returns:
            A new access_token (string) for the administrator user for use with the Keycloak admin-cli client.
        """
        url = f"{settings.KEYCLOAK_BASE_URL}/realms/{settings.KEYCLOAK_REALM_NAME}/protocol/openid-connect/token"
        payload = f"{urlencode({'client_id': client_id})}&{urlencode({'username': username})}&{urlencode({'password': password})}&grant_type=password&{urlencode({'client_secret': client_secret})}&{urlencode({'scope': 'email openid'})}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        response = requests.request("POST", url, headers=headers, data=payload)
        return response.json()["access_token"]

    def _generate_keycloak_user_payload(self, user, keycloak_group_path):
        """
        Returns a dictionary formatted as the expected user representation for the
        Keycloak partialImport Admin REST API endpoint.

        Args:
            user (models.User): A Django User model record.
            keycloak_group_path (str): The Keycloak group path which newly created users should be added to.

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
            "groups": [keycloak_group_path],
        }
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
        unsynced_users_social_auth_query = Q()
        if kwargs["filter_provider_name"] is not None:
            unsynced_users_social_auth_query &= Q(
                social_auth__provider=kwargs["filter_provider_name"]
            )
        unsynced_users = (
            User.objects.only("email")
            .exclude(social_auth__provider="ol-oidc")
            .exclude(userexporttokeycloak__isnull=False)
            .filter(unsynced_users_social_auth_query)
            .select_related("userexporttokeycloak")
            .prefetch_related("social_auth")
        )
        if kwargs["filter_provider_name"] is not None:
            unsynced_users = unsynced_users.filter(
                social_auth__provider=kwargs["filter_provider_name"]
            )
        access_token = self._get_access_token(
            kwargs["client_id"],
            kwargs["username"],
            kwargs["password"],
            kwargs["client_secret"],
        )

        unsynced_users_keycloak_payload_array = []

        # Process batches of the users who must be exported.
        batch_size = kwargs["batch_size"]
        for i in range(0, len(unsynced_users), batch_size):
            batch = unsynced_users[i : i + batch_size]
            for user in batch:
                unsynced_users_keycloak_payload_array.append(
                    self._generate_keycloak_user_payload(
                        user, kwargs["keycloak_group_path"]
                    )
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
                    kwargs["username"],
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
