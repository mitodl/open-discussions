from social_core.backends.open_id_connect import OpenIdConnectAuth


class OlOpenIdConnectAuth(OpenIdConnectAuth):
    """Custom wrapper class for adding additional functionality to the
    OpenIdConnectAuth child class.
    """

    name = "ol-oidc"

    # Adds expires_in to work with Keycloak.  Expires must be in extra_data for user_social_auth_record.get_access_token to work.
    EXTRA_DATA = [
        "id_token",
        "refresh_token",
        ("sub", "id"),
        ("expires_in", "expires"),
    ]
