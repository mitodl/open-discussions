"""Check for spam"""
import logging
import re
from types import SimpleNamespace

import akismet
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.utils.functional import SimpleLazyObject
from ipware import get_client_ip

from channels.models import SpamCheckResult
from open_discussions import features

log = logging.getLogger()


def save_spam_result(*, user_ip, user_agent, object_type, object_id, is_spam):
    """
    Create or update a SpamCheck object with Akismet result

    Args:
        user_ip(str): user's ip address
        user_agent(str): user's browser agent
        object_type(ContentType): the type of object (post, comment) to check
        object_id(int): The id of the object
        is_spam(bool): if the object was flagged as spam
    """
    result, created = SpamCheckResult.objects.get_or_create(
        content_type=object_type,
        object_id=object_id,
        defaults={
            "checks": 1,
            "user_ip": user_ip,
            "user_agent": user_agent,
            "is_spam": is_spam,
        },
    )
    if not created:
        result.user_ip = user_ip
        result.user_agent = user_agent
        result.checks = result.checks + 1
        result.is_spam = is_spam
        result.save()


def extract_spam_check_headers(request):
    """Extract and validate the headers"""
    user_ip, _ = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    return SimpleNamespace(user_ip=user_ip, user_agent=user_agent)


def exempt_from_spamcheck(email):
    """
    Determine if a user should be exempt from a spam check based on email

    Args:
        email(str): The email of the user

    Returns:
        bool: True if exempt else False
    """
    pattern = "|".join([email for email in settings.SPAM_EXEMPT_EMAILS])
    return (
        features.is_enabled(features.SPAM_EXEMPTIONS)
        and re.search(r"({})$".format(pattern), email) is not None
    )


def create_akismet_client():
    """Initialize the akismet client"""
    if not all([settings.AKISMET_API_KEY, settings.AKISMET_BLOG_URL]):
        log.info(
            "One or more of AKISMET_API_KEY and AKISMET_BLOG_URL is not configured"
        )
        return None

    try:
        return akismet.Akismet(
            key=settings.AKISMET_API_KEY, blog_url=settings.AKISMET_BLOG_URL
        )
    except akismet.AkismetError:
        log.exception("Akismet is not configured correctly")
    except:  # pylint: disable=bare-except
        log.exception("Error initializing Akismet client")

    return None


class SpamChecker:
    """Spam checking for posts and comments"""

    def __init__(self):
        self._client = SimpleLazyObject(create_akismet_client)

    def _can_spam_check(self):
        """Returns True if the spam checker is properly configured and can operate"""
        return hasattr(self._client, "comment_check")

    def is_post_spam(self, *, user_ip, user_agent, post):
        """
        Detect if a post is spam

        Args:
            user_ip(str): user's ip address
            user_agent(str): user's browser agent
            post(channels.models.Post): the post to check

        Returns:
            bool: True if the post is spam
        """
        if not self._can_spam_check():
            # if we can't verify it, assume it's not spam
            return False

        if not user_ip or not user_agent:
            log.info("Couldn't determine user agent or ip, assuming to be spam")
            return True

        try:
            log.debug("Spam checking post content")
            return self._client.comment_check(
                user_ip=user_ip,
                user_agent=user_agent,
                comment_content=post.plain_text,
                comment_type="forum-post",
                comment_author=post.author.profile.name,
                comment_author_email=post.author.email,
                is_test=settings.AKISMET_IS_TESTING,
            )
        except:  # pylint: disable=bare-except
            log.exception("Error trying to spam check w/ Akismet")
            return False

    def is_comment_spam(self, *, user_ip, user_agent, comment):
        """
        Detect if a comment is spam

        Args:
            user_ip(str): user's ip address
            user_agent(str): user's browser agent
            comment(channels.models.Comment): the comment to check

        Returns:
            bool: True if the comment is spam
        """
        if not self._can_spam_check():
            # if we can't verify it, assume it's not spam
            return False

        if not user_ip or not user_agent:
            log.info("Couldn't determine user agent or ip, assuming to be spam")
            return True

        try:
            log.debug("Spam checking comment content")
            return self._client.comment_check(
                user_ip=user_ip,
                user_agent=user_agent,
                comment_content=comment.text,
                comment_type="reply",
                comment_author=comment.author.profile.name,
                comment_author_email=comment.author.email,
                is_test=settings.AKISMET_IS_TESTING,
            )
        except:  # pylint: disable=bare-except
            log.exception("Error trying to spam check w/ Akismet")
            return False
