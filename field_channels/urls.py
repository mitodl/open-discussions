"""Urls for field_channels"""
from django.conf.urls import url, include
from rest_framework.routers import DefaultRouter

from field_channels.views import FieldChannelViewSet, SubFieldViewSet, SubFieldListViewSet

router = DefaultRouter()
router.register(
    r"subfields", SubFieldViewSet, basename="subfields_api"
)
router.register(
    r"fields", FieldChannelViewSet, basename="fields_api"
)

# router.register(r"userlists", views.UserListViewSet, basename="userlists").register(
#     r"items",
#     views.UserListItemViewSet,
#     basename="userlistitems",
#     parents_query_lookups=["user_list_id"],
# )
# field_channel_route.register(
#     "subfields",
#     SubFieldViewSet,
#     basename="fields_subfields_api",
#     parents_query_lookups=["field"],
# )
# field_channel_route.register(
#     "subfield_lists",
#     SubFieldListViewSet,
#     basename="fields_subfield_lists_api",
#     parents_query_lookups=["subfield"],
# )

urlpatterns = [
    url(r"^api/", include(router.urls)),
]
