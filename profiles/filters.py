"""Profile/user filters"""
import django_filters
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFilter(django_filters.FilterSet):
    """User filter"""

    email__endswith = django_filters.CharFilter(
        field_name="email", lookup_expr="iendswith"
    )
    social_auth_provider = django_filters.Filter(
        field_name="social_auth", lookup_expr="provider__in"
    )

    class Meta:
        model = User
        fields = ("email__endswith", "social_auth_provider")
