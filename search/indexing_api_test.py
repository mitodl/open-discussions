"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import pytest
from opensearchpy.exceptions import ConflictError, NotFoundError

from course_catalog.factories import (
    ContentFileFactory,
    CourseFactory,
    LearningResourceRunFactory,
)
from course_catalog.models import ContentFile
from open_discussions.factories import UserFactory
from open_discussions.utils import chunks
from search import indexing_api
from search.api import gen_course_id
from search.connection import get_default_alias_name
from search.constants import (
    ALIAS_ALL_INDICES,
    PROFILE_TYPE,
    SCRIPTING_LANG,
    UPDATE_CONFLICT_SETTING,
)
from search.exceptions import ReindexException
from search.indexing_api import (
    clear_and_create_index,
    create_backing_index,
)


pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("mocked_es")]


@pytest.fixture()
def mocked_es(mocker, settings):
    """Mocked ES client objects/functions"""
    index_name = "test"
    settings.OPENSEARCH_INDEX = index_name
    conn = mocker.Mock()
    get_conn_patch = mocker.patch(
        "search.indexing_api.get_conn", autospec=True, return_value=conn
    )
    mocker.patch("search.connection.get_conn", autospec=True)
    yield SimpleNamespace(
        get_conn=get_conn_patch,
        conn=conn,
        index_name=index_name,
        default_alias=default_alias,
        reindex_alias=reindex_alias,
        active_aliases=[default_alias, reindex_alias],
    )

