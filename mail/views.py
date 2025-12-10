"""Mail views"""
from types import SimpleNamespace

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from mail import api
from mail.forms import EmailDebuggerForm


@method_decorator(csrf_exempt, name="dispatch")
class EmailDebuggerView(View):
    """Email debugger view"""

    form_cls = EmailDebuggerForm
    initial = {}
    template_name = "email_debugger.html"

    def get(self, request):
        """Dispalys the debugger UI
        """
        form = self.form_cls(initial=self.initial)
        return render(request, self.template_name, {"form": form})

    def post(self, request):
        """Renders a test email
        """
        form = self.form_cls(request.POST)

        if not form.is_valid():
            return JsonResponse({"error": "invalid input"})

        email_type = form.cleaned_data["email_type"]
        context = {
            "base_url": settings.SITE_BASE_URL,
            "anon_token": "abc123",
            "site_name": settings.OPEN_DISCUSSIONS_TITLE,
        }

        # static, dummy data
        if email_type == "password_reset":
            context.update({"uid": "abc-def", "token": "abc-def"})
        elif email_type == "verification":
            context.update({"confirmation_url": "http://www.example.com/comfirm/url"})
        elif email_type == "comments":
            context.update(
                {
                    "post": SimpleNamespace(
                        id="abc",
                        title="Batman Rules!",
                        slug="batman_rules",
                        channel_name="channel_name",
                        channel_title="Favorite Superheros",
                    ),
                    "comment": SimpleNamespace(
                        id="def", text="Your post is really awesome!"
                    ),
                }
            )
        elif email_type == "frontpage":
            context.update(
                {
                    "posts": [
                        SimpleNamespace(
                            id="abc",
                            author_name="Steve Brown",
                            author_headline="Physics Professor",
                            author_id="njksdfg",
                            title="Batman Rules!",
                            url="http://example.com/batman.jpg",
                            url_domain="example.com",
                            slug="batman_rules",
                            created="2018-09-19T18:50:32+00:00",
                            channel_name="channel_name",
                            channel_title="Favorite Superheros",
                        ),
                        SimpleNamespace(
                            id="def",
                            author_name="Casey Adams",
                            author_headline="Graduate Student",
                            author_id="ghjkl",
                            title="I, however, do not concur",
                            slug="i_however_do_not_concur",
                            created="2018-09-19T18:50:32+00:00",
                            channel_name="channel_name",
                            channel_title="Favorite Superheros",
                        ),
                    ],
                    "episodes": [
                        SimpleNamespace(
                            title="Pasta is tasty!",
                            last_modified="2018-09-19T18:50:32+00:00",
                            podcast_title="cooking podcast",
                        ),
                        SimpleNamespace(
                            title="Superman is better",
                            last_modified="2018-09-19T18:50:32+00:00",
                            podcast_title="Favorite Superheros",
                        ),
                    ],
                }
            )

        subject, text_body, html_body = api.render_email_templates(email_type, context)

        return JsonResponse(
            {"subject": subject, "html_body": html_body, "text_body": text_body}
        )
