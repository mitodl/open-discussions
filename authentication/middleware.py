"""Authentication middleware"""
from urllib.parse import quote

from django.db.models import Q
from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin
from ipware import get_client_ip
from rest_framework.permissions import SAFE_METHODS
from social_core.exceptions import SocialAuthBaseException
from social_django.middleware import SocialAuthExceptionMiddleware

from authentication.models import BlockedIPRange


class SocialAuthExceptionRedirectMiddleware(SocialAuthExceptionMiddleware):
    """This middleware subclasses SocialAuthExceptionMiddleware and overrides
    process_exception to provide an implementation that does not use
    django.contrib.messages and instead only issues a redirect
    """

    def process_exception(self, request, exception):
        """Note: this is a subset of the SocialAuthExceptionMiddleware implementation
        """
        strategy = getattr(request, "social_strategy", None)
        if strategy is None or self.raise_exception(request, exception):
            return None

        if isinstance(exception, SocialAuthBaseException):
            backend = getattr(request, "backend", None)
            backend_name = getattr(backend, "name", "unknown-backend")

            message = self.get_message(request, exception)
            url = self.get_redirect_uri(request, exception)

            if url:
                url += (("?" in url and "&") or "?") + f"message={quote(message)}&backend={backend_name}"
                return redirect(url)


class BlockedIPMiddleware(MiddlewareMixin):
    """Only allow GET/HEAD requests for blocked ips, unless exempt or a superuser
    """

    def process_view(
        self, request, callback, callback_args, callback_kwargs
    ):  # pylint:disable=unused-argument
        """Blocks an individual request if: it is from a blocked ip range, routable, not a safe request
        and not from a superuser (don't want admins accidentally locking themselves out).

        Args:
            request (django.http.request.Request): the request to inspect

        """
        if (
            not getattr(callback, "blocked_ip_exempt", False)
            and not request.user.is_superuser
            and not request.path.startswith("/admin/")
        ):
            user_ip, is_routable = get_client_ip(request)

            if user_ip is None or (
                is_routable
                and request.method not in SAFE_METHODS
                and BlockedIPRange.objects.filter(
                    Q(ip_start__lte=user_ip) & Q(ip_end__gte=user_ip)
                ).count()
                > 0
            ):
                return HttpResponseForbidden()
