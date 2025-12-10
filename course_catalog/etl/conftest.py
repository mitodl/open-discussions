"""Common ETL test fixtures"""
import json

import pytest


@pytest.fixture(autouse=True)
def mitx_settings(settings):
    """Test settings for MITx import"""
    settings.EDX_API_CLIENT_ID = "fake-client-id"
    settings.EDX_API_CLIENT_SECRET = "fake-client-secret"
    settings.EDX_API_ACCESS_TOKEN_URL = "http://localhost/fake/access/token/url"
    settings.EDX_API_URL = "http://localhost/fake/api/url"
    settings.MITX_BASE_URL = "http://localhost/fake/base/url"
    settings.MITX_ALT_URL = "http://localhost/fake/alt/url"
    return settings


@pytest.fixture(autouse=True)
def oll_settings(settings):
    """Test settings for MITx import"""
    settings.OLL_API_CLIENT_ID = "fake-client-id"
    settings.OLL_API_CLIENT_SECRET = "fake-client-secret"
    settings.OLL_API_ACCESS_TOKEN_URL = "http://localhost/fake/access/token/url"
    settings.OLL_API_URL = "http://localhost/fake/api/url"
    settings.OLL_BASE_URL = "http://localhost/fake/base/url"
    settings.OLL_ALT_URL = "http://localhost/fake/alt/url"
    return settings


@pytest.fixture
def mitx_course_data():
    """Catalog data fixture"""
    with open("./test_json/test_mitx_course.json") as f:
        yield json.loads(f.read())


@pytest.fixture
def non_mitx_course_data():
    """Catalog data fixture"""
    with open("./test_json/test_non_mitx_course.json") as f:
        yield json.loads(f.read())
