"""Pipeline functions for channel invitations"""


def resolve_outstanding_channel_invites(
    strategy, backend, *args, user=None, is_new=False, **kwargs
):  # pylint: disable=unused-argument
    """
    Resolves outstanding channel invitations when a user joins (deprecated - no-op)

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_new (bool): True if the user just got created
    """
    return {}
