from urllib.parse import urljoin
import sys

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.core.management import BaseCommand, CommandError
import requests

from keycloak_user_export.models import UserExportToKeycloak

User = get_user_model()


class Command(BaseCommand):
    """
    Creates Keycloak user records for all Django user records which have no associated
    social-auth record for the "ol-oidc" provider.  The Keycloak user
    record is populated with the Django user's first_name, last_name, and email.

    Optionally, the "--filter-provider-name" argument can be defined (string) when running this script.
    If defined, Keycoak user records will be created only for Django user records which have no associated
    social-auth record for the "ol-oidc" provider, and have a social-auth record with a provider
    equal to the argument value.

    Optionally, the "--keycloak-group-path" argument can be defined (string) when running this script
    which will add all created Keycloak users to the Keycloak group path defined as the
    argument value.  For example, "--keycloak-group-path=/imported/open-discussions/touchstone".
    If the argument is defined, the Keycloak group path must exist prior to executing this script.

    Optionally, the "--batch-size" argument can be defined (int) when running this script.
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
            "--verbose",
            help="Enable verbose logging",
            action="store_true",
            default=False,
        )
        parser.add_argument(
            "--client-id",
            required=True,
            help="Client ID for the Keycloak Admin-CLI client.",
        )
        parser.add_argument(
            "--client-secret",
            required=True,
            help="Client secret for the Keycloak Admin-CLI client.",
        )
        parser.add_argument(
            "--batch-size",
            nargs="?",
            default=25,
            type=int,
            help="(Optional) How many users to export to Keycloak at a time.",
        )
        parser.add_argument(
            "--keycloak-group-path",
            nargs="?",
            default="",
            type=str,
            help="(Optional) The Keycloak group's path users should will added to.",
        )
        parser.add_argument(
            "--filter-provider-name",
            nargs="?",
            default=None,
            type=str,
            help="(Optional) Only create Keycloak users for Django user records associated with a specific social-auth provider.",
        )

    def _refresh_auth(
        self,
        session: requests.Session,
        client_id: str,
        client_secret: str,
    ):
        """
        Creates a new access token for a Keycloak realm administrator for use with the admin-cli client.

        Args:
            session (requests.Session): The requests session to use and update
            client_id (str): The client_ID associated with Keycloak's admin-cli client.
            client_secret (str): The client secret associated with Keycloak's admin-cli client.

        """
        url = urljoin(
            settings.KEYCLOAK_BASE_URL,
            f"/realms/{settings.KEYCLOAK_REALM_NAME}/protocol/openid-connect/token",
        )
        payload = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "email openid",
        }

        response = requests.post(url, data=payload)

        if response.status_code != 200:
            self.stderr.write(
                self.style.ERROR(
                    f"Got error requesting access token: {response.json()}"
                )
            )
            sys.exit(1)

        access_token = response.json()["access_token"]
        session.headers.update(
            {
                "Authorization": f"Bearer {access_token}",
            }
        )

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
            "createdTimestamp": user.date_joined.timestamp() * 1000,
            "username": user.email,
            "enabled": True,
            "emailVerified": True,
            "email": user.email,
            "totp": False,
            "credentials": [],
            "disableableCredentialTypes": [],
            "requiredActions": [],
            "notBefore": 0,
            "realmRoles": [f"default-roles-{settings.KEYCLOAK_REALM_NAME}"],
            "groups": [keycloak_group_path] if keycloak_group_path else [],
            "attributes": {
                "fullName": user.profile.name,
                "emailOptIn": 1 if user.profile.email_optin else 0,
            }
            if hasattr(user, "profile")
            else {},
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

    def _log_api_call(self, response):
        """Log the API call to keycloak"""
        status_code = response.status_code

        if not self.verbose and status_code == 200:
            return

        log_out = self.stdout if status_code == 200 else self.stderr

        log_out.write(f"{response.request.method} {response.request.url}")
        log_out.write(f"Status code: {status_code}")
        log_out.write(f"Request:\t{response.request.body.decode('utf-8')}")
        log_out.write(f"Response:\t{response.text}")

    def handle(self, *args, **kwargs):
        self.verbose = kwargs["verbose"]

        self._verify_environment_variables_configured()

        keycloak_partial_import_url = f"{settings.KEYCLOAK_BASE_URL}/admin/realms/{settings.KEYCLOAK_REALM_NAME}/partialImport"
        unsynced_users_social_auth_query = Q()
        if kwargs["filter_provider_name"] is not None:
            unsynced_users_social_auth_query &= Q(
                social_auth__provider=kwargs["filter_provider_name"]
            )
        unsynced_users = (
            User.objects.only("email", "date_joined")
            .filter(is_active=True)
            .exclude(social_auth__provider="ol-oidc")
            .exclude(userexporttokeycloak__isnull=False)
            .filter(unsynced_users_social_auth_query)
            .prefetch_related("profile")
        )

        with requests.Session() as session:
            self._refresh_auth(
                session,
                kwargs["client_id"],
                kwargs["client_secret"],
            )

            # Process batches of the users who must be exported.
            batch_size = kwargs["batch_size"]
            # the users are updated in such a way that they're excluded from this query the next time
            # so we just keep grabbing a slice from the beginning of the query until it returns empty
            while batch := unsynced_users[:batch_size]:
                payload = {
                    "ifResourceExists": "SKIP",
                    "realm": settings.KEYCLOAK_REALM_NAME,
                    "users": [
                        self._generate_keycloak_user_payload(
                            user, kwargs["keycloak_group_path"]
                        )
                        for user in batch
                    ],
                }
                response = session.post(keycloak_partial_import_url, json=payload)
                # If Keycloak responds with a 401, refresh the access_token and retry once.
                if response.status_code == 401:
                    self._refresh_auth(
                        session,
                        kwargs["client_id"],
                        kwargs["client_secret"],
                    )
                    response = session.post(keycloak_partial_import_url, json=payload)

                self._log_api_call(response)

                if response.status_code == 200:
                    user_synced_with_keycloak_records = []
                    keycloak_response_body = response.json()

                    # Expect the response below from Keycloak.
                    # {"overwritten":0,"added":0,"skipped":1,"results":[{"action":"ADDED","resourceType":"USER","resourceName":"collinp@mit.edu","id":"b2fb40bc-5c68-4f4b-b3ab-d178cd593454"}]}
                    keycloak_results = keycloak_response_body["results"]
                    # Convert the keycloak_results to a dictionary using the user email as the key.
                    keycloak_results_email_key_dict = {
                        item["resourceName"]: item for item in keycloak_results
                    }
                    for user in batch:
                        action = keycloak_results_email_key_dict[user.email]["action"]
                        if action in ("ADDED", "SKIPPED"):
                            user_synced_with_keycloak_records.append(
                                UserExportToKeycloak(user=user, action=action)
                            )
                        else:
                            self.stderr.write(
                                f"Unexpected action '{action} for user '{user.email}"
                            )
                    UserExportToKeycloak.objects.bulk_create(
                        user_synced_with_keycloak_records, ignore_conflicts=True
                    )
