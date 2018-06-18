"""URL configurations for authentication"""
from django.conf.urls import url
from django.contrib.auth import views as auth_views

from authentication.views import (
    LoginEmailView,
    LoginPasswordView,
    RegisterEmailView,
    RegisterConfirmView,
    RegisterDetailsView,
    login_complete,
)


urlpatterns = [
    url(r'^api/v0/login/email/$', LoginEmailView.as_view()),
    url(r'^api/v0/login/password/$', LoginPasswordView.as_view()),
    url(r'^api/v0/register/email/$', RegisterEmailView.as_view()),
    url(r'^api/v0/register/confirm/$', RegisterConfirmView.as_view()),
    url(r'^api/v0/register/details/$', RegisterDetailsView.as_view()),
    url(r'^login/complete$', login_complete, name='login-complete'),
    url(r'^logout/$', auth_views.logout, name='logout'),
]
