"""
Email APIs

Example usage:

# get recipients
recipients = User.objects.all()[:10]

# generator for recipient emails
messages = messages_for_recipients([
    (recipient, user, {
        # per-recipient context here
    }) for recipient, user in safe_format_recipients(recipients)
], 'sample')

# optional: anything else to `messages` beyond what `messages_for_recipients` does

# send the emails
try:
    send_messages(messages)
except SendEmailsException as exc:
    pass  # handle failed emails
"""
from anymail.message import AnymailMessage
from django.conf import settings
from django.core import mail
from django.template.loader import render_to_string

from mail.exceptions import SendEmailsException


def safe_format_recipients(recipients):
    """
    Returns a "safe" list of formatted recipients.
    This means if MAILGUN_RECIPIENT_OVERRIDE is set, we only use that.

    Args:
        recipients (iterable of User): recipient users

    Returns:
        list of str: list of recipient emails to send to
    """
    if not recipients:
        return []

    # we set this for local development so we don't actually email someone
    if settings.MAILGUN_RECIPIENT_OVERRIDE is not None:
        return [(settings.MAILGUN_RECIPIENT_OVERRIDE, recipients[0])]

    return [
        (_format_recipient(user.email, name=user.profile.name), user)
        for user in recipients
        if _can_email_user(user)
    ]


def _can_email_user(user):
    """
    Returns True if the user has an email and hasn't opted out

    Args:
        user (User): user to checklist

    Returns:
        bool: True if we can email this user
    """
    return user.email and user.profile.email_optin


def _format_recipient(email, *, name=None):
    """
    Formats a recipient's email address using an optional name

    Args:
        email (str): email address of the recipients
        name (str): name of the recipient

    Returns:
        str: formatted email address
    """
    if name:
        return "{name} <{email}>".format(
            name=name,
            email=email,
        )
    else:
        return email


def render_email_templates(template_name, user, context=None):
    """
    Renders the email templates for the email

    Args:
        template_name (str): name of the template, this should match a directory in mail/templates
        user (User): user this email is being sent
        context (dict): additional context data for the email

    Returns:
        (str, str, str): tuple of the templates for subject, text_body, html_body
    """
    ctx = {
        'user': user,
    }

    if context is not None:
        ctx.update(context)

    return (
        render_to_string('{}/subject.txt'.format(template_name), ctx).rstrip(),
        render_to_string('{}/body.txt'.format(template_name), ctx),
        render_to_string('{}/body.html'.format(template_name), ctx),
    )


def messages_for_recipients(recipients_and_contexts, template_name):
    """
    Creates the messages to the recipients using the templates

    Args:
        recipients_and_contexts (list of (User, dict)): list of users and their contexts as a dict
        template_name (str): name of the template, this should match a directory in mail/templates

    Yields:
        EmailMultiAlternatives: email message with rendered content
    """
    with mail.get_connection(settings.NOTIFICATION_EMAIL_BACKEND) as connection:
        for recipient, user, context in recipients_and_contexts:
            subject, text_body, html_body = render_email_templates(template_name, user, context=context)
            msg = AnymailMessage(
                subject=subject,
                body=text_body,
                to=[recipient],
                bcc=[settings.MAILGUN_BCC_TO_EMAIL] if settings.MAILGUN_BCC_TO_EMAIL else [],
                from_email=settings.MAILGUN_FROM_EMAIL,
                connection=connection,
            )
            msg.attach_alternative(html_body, "text/html")
            yield msg


def send_messages(messages):
    """
    Sends the messages

    Args:
        messages (list of EmailMultiAlternatives): list of messages to send

    Raises:
        SendEmailsException: error if any messages failed to send and why
    """
    failed_message_errors = []
    for msg in messages:
        try:
            msg.send()
        except Exception as exc:  # pylint: disable=broad-except
            failed_message_errors.append(
                (msg, exc)
            )

    if failed_message_errors:
        raise SendEmailsException(failed_message_errors)
