"""URL configurations for authentication"""
from django.conf.urls import url
from django.contrib.auth import views as auth_views

from authentication.views import (
    login,
    register,
    confirmation_sent,
    jwt_login_complete,
)


urlpatterns = [
    url(r'^login/$', login, name='login'),
    url(r'^login/micromasters/complete', jwt_login_complete, name='jwt-complete'),
    url(r'^register/$', register, name='register'),
    url(r'^register/confirmation_sent/$', confirmation_sent, name='confirmation-sent'),
    url(r'^logout/$', auth_views.logout, name='logout'),
]
