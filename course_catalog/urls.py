"""project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.urls import include
from rest_framework.routers import DefaultRouter

from course_catalog import views

router = DefaultRouter()
router.register(r"courses", views.CourseViewSet, basename="courses")
router.register(r"bootcamps", views.BootcampViewSet, basename="bootcamps")
router.register(r"programs", views.ProgramViewSet, basename="programs")
router.register(r"userlists", views.UserListViewSet, basename="userlists")

urlpatterns = [
    url(r"^api/v0/", include(router.urls)),
    url(
        r"^api/v0/ocw-course-report", views.ocw_course_report, name="ocw-course-report"
    ),
]
