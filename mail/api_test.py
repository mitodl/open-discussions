"""API tests"""
from email.utils import formataddr
import pytest

from mail.api import (
    context_for_user,
    safe_format_recipients,
    render_email_templates,
    send_messages,
    messages_for_recipients,
)
from open_discussions.factories import UserFactory

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('email_settings'),
]


@pytest.fixture
def email_settings(settings):
    """Default settings for email tests"""
    settings.MAILGUN_RECIPIENT_OVERRIDE = None


def test_safe_format_recipients():
    """Test that we get a list of emailable recipients"""
    user = UserFactory.create()
    user_no_email = UserFactory.create(email='')
    user_no_name = UserFactory.create(profile__name='')
    assert safe_format_recipients([user, user_no_email, user_no_name]) == [
        (formataddr((user.profile.name, user.email)), user),
        (formataddr((None, user_no_name.email)), user_no_name),
    ]


def test_safe_format_recipients_override(user, settings):
    """Test that the recipient override works"""
    settings.MAILGUN_RECIPIENT_OVERRIDE = 'admin@localhost'
    assert safe_format_recipients([user]) == [('admin@localhost', user)]


def test_render_email_templates(user):
    """Test render_email_templates"""
    user.profile.name = 'Jane Smith'
    context = context_for_user(user, {'url': 'http://example.com'})
    subject, text_body, html_body = render_email_templates('sample', context)
    assert subject == "Welcome Jane Smith"
    assert text_body == "html link (http://example.com)"
    assert html_body == ('<html>\n'
                         '<head></head>\n'
                         '<body><a href="http://example.com" style="color:red">html link</a></body>\n'
                         '</html>\n')


def test_messages_for_recipients():
    """Tests that messages_for_recipients works as expected"""

    users = UserFactory.create_batch(5)

    messages = list(
        messages_for_recipients([(recipient, context_for_user(user, {
            'url': 'https://example.com',
        })) for recipient, user in safe_format_recipients(users)], 'sample'))

    assert len(messages) == len(users)

    for user, msg in zip(users, messages):
        assert user.email in str(msg.to[0])
        assert msg.subject == "Welcome {}".format(user.profile.name)


def test_send_message(mailoutbox):
    """Tests that send_messages works as expected"""
    users = UserFactory.create_batch(5)

    messages = list(
        messages_for_recipients([(recipient, context_for_user(user, {
            'url': 'https://example.com',
        })) for recipient, user in safe_format_recipients(users)], 'sample'))

    send_messages(messages)

    for message in mailoutbox:
        assert message in messages
