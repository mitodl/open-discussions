"""Authentication-based decorators"""
from functools import wraps


def blocked_ip_exempt(view_func):
    """Mark a view function as being exempt from blocked IP protection."""

    def wrapped_view(*args, **kwargs):
        return view_func(*args, **kwargs)

    wrapped_view.blocked_ip_exempt = True
    return wraps(view_func)(wrapped_view)
