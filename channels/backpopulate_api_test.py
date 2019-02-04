"""Backpopulate API tests"""
from datetime import datetime, timezone

import pytest

from channels import backpopulate_api
from channels.constants import (
    LINK_TYPE_SELF,
    LINK_TYPE_LINK,
    EXTENDED_POST_TYPE_ARTICLE,
    VALID_EXTENDED_POST_TYPES,
    DELETED_COMMENT_OR_POST_TEXT,
)
from channels.factories.models import PostFactory, ArticleFactory, LinkMetaFactory
from channels.models import Comment
from channels.test_utils import assert_properties_eq
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


CREATED_TIMESTAMP = 1_547_749_404
CREATED_ON_DATETIME = datetime(2019, 1, 17, 18, 23, 24, tzinfo=timezone.utc)


@pytest.mark.parametrize("post_type", VALID_EXTENDED_POST_TYPES)
@pytest.mark.parametrize("has_author", [True, False])
@pytest.mark.parametrize("author_exists", [True, False])
@pytest.mark.parametrize("is_removed", [True, False])
@pytest.mark.parametrize("is_deleted", [True, False])
@pytest.mark.parametrize("is_edited", [True, False])
def test_backpopulate_post(
    mocker,
    settings,
    post_type,
    has_author,
    author_exists,
    is_removed,
    is_deleted,
    is_edited,
):  # pylint: disable=too-many-arguments,too-many-locals
    """Tests backpopulate_post"""

    settings.EMBEDLY_KEY = "abc"
    author = UserFactory.create()
    post = PostFactory.create(unpopulated=True, post_type=None)
    if post_type == EXTENDED_POST_TYPE_ARTICLE:
        post.article = ArticleFactory.create(author=author)
        post.save()
    mock_author = mocker.Mock()
    mock_author.configure_mock(name=author.username if author_exists else "missing")

    if is_deleted:
        selftext = DELETED_COMMENT_OR_POST_TEXT
    elif post_type == LINK_TYPE_SELF:
        selftext = "content"
    else:
        selftext = ""

    url, link_meta = None, None
    if post_type == LINK_TYPE_LINK:
        url = "http://example.com"
        link_meta = LinkMetaFactory.create(url=url)

    mock_link_meta = mocker.patch(
        "channels.utils.get_or_create_link_meta", return_value=link_meta
    )

    submission = mocker.Mock(
        id=post.post_id,
        title="title",
        is_self=post_type != LINK_TYPE_LINK,
        author=mock_author if has_author else None,
        selftext=selftext,
        url=url,
        ups=12,
        num_comments=123,
        edited=is_edited,
        banned_by="abc" if is_removed else None,
        created=CREATED_TIMESTAMP,
    )
    backpopulate_api.backpopulate_post(post=post, submission=submission)

    post.refresh_from_db()

    if post_type == LINK_TYPE_LINK:
        mock_link_meta.assert_called_once_with(url)
    else:
        mock_link_meta.assert_not_called()

    assert_properties_eq(
        post,
        dict(
            author=author if has_author and author_exists else None,
            text=selftext if post_type == LINK_TYPE_SELF else None,
            link_meta=link_meta,
            title="title",
            edited=is_edited,
            score=12,
            url=url,
            num_comments=123,
            created_on=CREATED_ON_DATETIME,
            removed=is_removed,
            deleted=is_deleted,
            post_type=post_type,
        ),
    )


def test_backpopulate_comments(mocker):
    """Tests backpopulate_comments"""
    author = UserFactory.create()
    mock_author = mocker.Mock()
    mock_author.configure_mock(name=author.username)
    missing_author = mocker.Mock()
    missing_author.configure_mock(name="missing")
    post = PostFactory.create()
    submission = mocker.Mock(comments=mocker.MagicMock())
    comments = [
        mocker.Mock(
            id="1",
            parent_id=f"t3_{post.post_id}",
            author=mock_author,
            body="comment",
            score=12,
            edited=False,
            banned_by=None,
            created=CREATED_TIMESTAMP,
        ),
        # deleted
        mocker.Mock(
            id="2",
            parent_id=f"t3_{post.post_id}",
            author=mock_author,
            body=DELETED_COMMENT_OR_POST_TEXT,
            score=12,
            edited=False,
            banned_by=None,
            created=CREATED_TIMESTAMP,
        ),
        # removed
        mocker.Mock(
            id="3",
            parent_id=f"t3_{post.post_id}",
            author=mock_author,
            body="comment removed",
            score=12,
            edited=False,
            banned_by="abc",
            created=CREATED_TIMESTAMP,
        ),
        # edited
        mocker.Mock(
            id="4",
            parent_id=f"t3_{post.post_id}",
            author=mock_author,
            body="comment edited",
            score=12,
            edited=True,
            banned_by="abc",
            created=CREATED_TIMESTAMP,
        ),
        # missing author
        mocker.Mock(
            id="5",
            parent_id=f"t3_{post.post_id}",
            author=missing_author,
            body="comment missing author",
            score=12,
            edited=False,
            banned_by=None,
            created=CREATED_TIMESTAMP,
        ),
        # no author
        mocker.Mock(
            id="6",
            parent_id=f"t3_{post.post_id}",
            author=None,
            body="comment no author",
            score=12,
            edited=False,
            banned_by=None,
            created=CREATED_TIMESTAMP,
        ),
    ]
    submission.comments.list.return_value = comments

    result = backpopulate_api.backpopulate_comments(post=post, submission=submission)

    assert result == len(comments)

    submission.comments.replace_more.assert_called_once_with(limit=None)

    expected_values = [
        dict(
            author=author,
            text="comment",
            score=12,
            edited=False,
            removed=False,
            deleted=False,
            created_on=CREATED_ON_DATETIME,
        ),
        # deleted
        dict(
            author=author,
            text=DELETED_COMMENT_OR_POST_TEXT,
            score=12,
            edited=False,
            removed=False,
            deleted=True,
            created_on=CREATED_ON_DATETIME,
        ),
        # removed
        dict(
            author=author,
            text="comment removed",
            score=12,
            edited=False,
            removed=True,
            deleted=False,
            created_on=CREATED_ON_DATETIME,
        ),
        # edited
        dict(
            author=author,
            text="comment edited",
            score=12,
            edited=True,
            removed=True,
            deleted=False,
            created_on=CREATED_ON_DATETIME,
        ),
        # missing author
        dict(
            author=None,
            text="comment missing author",
            score=12,
            edited=False,
            removed=False,
            deleted=False,
            created_on=CREATED_ON_DATETIME,
        ),
        # no author
        dict(
            author=None,
            text="comment no author",
            score=12,
            edited=False,
            removed=False,
            deleted=False,
            created_on=CREATED_ON_DATETIME,
        ),
    ]

    populated_comments = list(
        Comment.objects.order_by("id").filter(
            comment_id__in=[comment.id for comment in comments]
        )
    )
    for comment, expected in zip(populated_comments, expected_values):
        assert_properties_eq(comment, expected)
