import calendar
import json
import urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, CommandError
from django.db.models import Q
import httpx

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
            "--username",
            help="Username of a Keycloak realm admin user.",
        )
        parser.add_argument(
            "--password",
            help="Password of a Keycloak realm admin user.",
        )
        parser.add_argument(
            "--client-id",
            help="Client ID for the Keycloak Admin-CLI client.",
        )
        parser.add_argument(
            "--client-secret",
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

    def _get_access_token(
        self, client: Client, client_id: str, username: str, password: str, client_secret: str
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
        payload = f"{urlencode(dict(client_id=client_id, username=username, password=password, grant_type='password', client_secret=client_secret, scope='email openid'))}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        response = requests.request("POST", url, headers=headers, data=payload)
        return response.json()["access_token"]
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

        unsynced_users_social_auth_query = Q()

        client_id = kwargs["client_id"]
        client_secret = kwargs["client_secret"]
        keycloak_group_path = kwargs["keycloak_group_path"]

        if kwargs["filter_provider_name"] is not None:
            unsynced_users_social_auth_query &= Q(
                social_auth__provider=kwargs["filter_provider_name"]
            )

        unsynced_users = (
            User.objects.only("email")
            .exclude(social_auth__provider="ol-oidc")
            .exclude(userexporttokeycloak__isnull=False)
            .exclude(profile__isnull=True)
            .filter(unsynced_users_social_auth_query)
            .select_related("userexporttokeycloak")
            .prefetch_related("social_auth")
        )

        # Process batches of the users who must be exported.
        batch_size = kwargs["batch_size"]

        with httpx.Client(
            # httpx kwargs
            base_url=urlparse.urljoin(
                settings.KEYCLOAK_BASE_URL,
                "/realms/",
                settings.KEYCLOAK_REALM_NAME,
            ),
            headers={
                "Content-Type": "application/json+scim",
            },
        ) as client:
            group_location = None

            client.fetch_token()

            response = client.get("/scim/v2/Groups")
            self.stdout.write(json.dumps(response.json(), indent=2))
            import sys
            sys.exit(1)
            for i in range(0, len(unsynced_users), batch_size):
                batch = unsynced_users[i : i + batch_size]
                operations = []

                for user in batch:
                    operations.append(
                        {
                            "method": "POST",
                            "path": "/Users",
                            "bulkId": user.email,
                            "data": {
                                "schemas": [
                                    "urn:ietf:params:scim:schemas:core:2.0:User"
                                ],
                                "userName": user.email,
                                "displayName": user.profile.name,
                                "emailOptIn": user.profile.email_optin,
                                "emails": [
                                    {
                                        "value": user.email,
                                        "primary": True,
                                    }
                                ],
                            },
                        }
                    )
                    if group_location:
                        operations.append(
                            {
                                "method": "PATCH",
                                "path": group_location,
                                "data": {
                                    "op": "add",
                                    "path": "members",
                                    "value": [
                                        {
                                            "value": f"bulkId:{user.email}",
                                            "type": "User",
                                        }
                                    ],
                                },
                            }
                        )

                payload = {
                    "schemas": ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
                    "Operations": operations,
                }

                response = client.post("/scim/v2/Bulk", json=payload)

                # If the response from Keycloak is not 200, print out an error and move on to
                # the next batch of users to export.
                if response.status_code != 200:
                    self.stderr.write(
                        self.style.ERROR(
                            f"Error calling Keycloak /Bulk API, returned: {response.content}"
                        )
                    )

                else:
                    user_synced_with_keycloak_records = []

                    operations = response.json()["Operations"]

                    # Convert the keycloak_results to a dictionary using the user email as the key.
                    keycloak_results_email_key_dict = {
                        item["bulkId"]: item for item in operations
                    }
                    for user in batch:
                        result = keycloak_results_email_key_dict[user.email]
                        status_code = int(result["status"])
                        if status_code == 201:
                            user_synced_with_keycloak_records.append(
                                UserExportToKeycloak(
                                    user=user, location=result["location"]
                                )
                            )
                        else:
                            detail = result["response"]["detail"]
                            self.stdout.write(f"Server error creating user: {detail}")

                    UserExportToKeycloak.objects.bulk_create(
                        user_synced_with_keycloak_records, ignore_conflicts=True
                    )
