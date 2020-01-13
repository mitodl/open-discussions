"""Search app config"""
from django.apps import AppConfig


class SearchAppConfig(AppConfig):
    """Search app config"""

    name = "search"

    def ready(self):
        """Application is ready"""
        from search import connection

        connection.configure_connections()
