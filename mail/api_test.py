"""API tests"""
import pytest

from mail.api import (
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
    assert safe_format_recipients([
        user, user_no_email, user_no_name
    ]) == [
        ("{} <{}>".format(user.profile.name, user.email), user),
        (user_no_name.email, user_no_name),
    ]


def test_safe_format_recipients_override(user, settings):
    """Test that the recipient override works"""
    settings.MAILGUN_RECIPIENT_OVERRIDE = 'admin@localhost'
    assert safe_format_recipients([user]) == [('admin@localhost', user)]


def test_render_email_templates(user):
    """Test render_email_templates"""
    user.profile.name = 'Jane Smith'
    context = {
        'url': 'http://example.com'
    }
    subject, text_body, html_body = render_email_templates('sample', user, context=context)
    assert subject == "Welcome Jane Smith"
    assert text_body == "plaintext link: http://example.com\n"
    assert html_body == '<a href="http://example.com">html link</a>\n'


def test_messages_for_recipients():
    """Tests that messages_for_recipients works as expected"""

    users = UserFactory.create_batch(5)

    messages = list(messages_for_recipients([
        (recipient, user, {
            'url': 'https://example.com',
        }) for recipient, user in safe_format_recipients(users)
    ], 'sample'))

    assert len(messages) == len(users)

    for user, msg in zip(users, messages):
        assert user.email in msg.to[0]
        assert msg.subject == "Welcome {}".format(user.profile.name)


def test_send_message(mailoutbox):
    """Tests that send_messages works as expected"""
    users = UserFactory.create_batch(5)

    messages = list(messages_for_recipients([
        (recipient, user, {
            'url': 'https://example.com',
        }) for recipient, user in safe_format_recipients(users)
    ], 'sample'))

    send_messages(messages)

    for message in mailoutbox:
        assert message in messages
