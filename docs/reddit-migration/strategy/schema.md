---
layout: default
parent: Strategy
grand_parent: Reddit Migration
nav_order: 1
---
# Establish a New Schema

We want to establish a new schema so that we have a clean slate to work with and because there will be some incompatible changes with the current schema. An example of this is the `Post.post_id` column is a reference to the reddit id, but in the future needs to be the primary key of the row (see [Reddit Ids](reddit-ids.md)). We can't do that in-place with the current table.
### Channels

Channels should have the fields carried over with the following adjustments:

 - `channel_id` -> `id`

### Posts

Posts should have the fields carried over with the following adjustments:

 - `post_id` -> `id`
 - `reports_ignored = BooleanField(default=False)`
   - Flag to indicate whether we're ignoring subsequent reports of the post
   - See "Moderation" for more details
 - `text` / `preview_text` / `plain_text`
   - We currently have several representations of textual post content, the 3 fields/properties listed above:
     - `text` is the markdown text for text posts
     - `preview_text` is precomputed plain text representation of link posts, sourced from and Embedly API request for that link
     `plain_text` is a `@property`, not a db column, but its logic is as follows:
       - If the post is an article, render the article to plain text
       - If the post is a text post, render the markdown to plain text
       - Otherwise use `preview_text`
    - See also: https://github.com/mitodl/open-discussions/blob/9a96f09ab4c8c617da3ba8842adb9c419c5d321d/docs/rfcs/0002-indexing-embedly-link-preview.md#4-related-but-separate-issue-getting-rid-of-either-the-plain_text-or-text-field-in-es-documents
    - We should to normalize `preview_text` / `plain_text` down to a single stored field so we're not recomputing it every time a read occurs.
    - We still need to keep the `text` field and the `article` relation


### Comments

Comments should have the fields carried over with the following adjustments:

 - `channel_id` -> `id`
 - `reports_ignored = BooleanField(default=False)`
   - Flag to indicate whether we're ignoring subsequent reports of the comment
   - See "Moderation" for more details

#### Comment Tree

Prior art:

 - SQL Antipatterns ("Naive Trees"):http://www.r-5.org/files/books/computers/languages/sql/style/Bill_Karwin-SQL_Antipatterns-EN.pdf
 - Models for Hierarchical Data: https://www.slideshare.net/billkarwin/models-for-hierarchical-data
 - Django treebeard: https://django-treebeard.readthedocs.io/en/latest/

Reddit stores comment trees in Cassandra, which is overkill for our current use cases. That said, we need to be able to migrate the comments in such a manner that we achieve the following:

- Maintain current API result structures
  - Specifically, we need to support some form of reddit's "more comments" pagination. This **does not** need to partition the comments exactly as reddit would, the interface just needs to be compatible with how the frontend traverses it.
- Support currently used sorting methods (best, old, new)
- Support rendering an arbitrary subtree of the comments for the comment detail view

From the Prior Art listed above, Materialized Paths are probably our best bet and we're already familiar to some degree with them because they're what `wagtail` uses under the hood for page hierarchies.

The big thing here is that in order to support the sorts we need one table/model for *each type of sort*. That precludes using a single table for everything but it simplifies reads because we can pick our sorting data model and then `prefetch_related` on the `Comment` table so that code can work generically over similarly structured tables. This approach means these sorting hierarchy tables end up being a sorted lookup table for extracting a portion of the comment tree.

An example of what the data model would look like (working branch [here](https://github.com/mitodl/open-discussions/tree/nl/reddit_schema_migration)):

```python
from django.db import models
from treebeard.mp_tree import MP_Node

class Post(models.Model):
  pass


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)


class CommentTreeNode(MP_Node):
    # specialize the alphabet for postgres
    # see: https://django-treebeard.readthedocs.io/en/latest/mp_tree.html#treebeard.mp_tree.MP_Node.alphabet
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    # a post can have many comments, but a reverse lookup into this tree isn't pragmatic
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name="+"
    )

    class Meta:
        abstract = True


class NewCommentTreeNode(CommentTreeNode):
    comment = models.OneToOneField(
        Comment,
        on_delete=models.CASCADE,
        unique=True,
        null=True,
        related_name="new_comment_node",
    )

    created = models.DateTimeField()

    node_order_by = ["-created"]


class OldCommentTreeNode(CommentTreeNode):
    comment = models.OneToOneField(
        Comment,
        on_delete=models.CASCADE,
        unique=True,
        null=True,
        related_name="old_comment_node",
    )

    created = models.DateTimeField()

    node_order_by = ["created"]


class BestCommentTreeNode(CommentTreeNode):
    comment = models.OneToOneField(
        Comment,
        on_delete=models.CASCADE,
        unique=True,
        null=True,
        related_name="best_comment_node",
    )

    score = models.IntegerField()

    node_order_by = ["-score"]
```

When a sorted column changes, it requires a move of the node. For the Old/New sorts those will never change. For the Best sort, it will change whenever a vote is made or updated. Fortunately, Materialized Paths are pretty efficient at this. An example with the above data models is:

```python
from django.db import transaction

post = Post.objects.create()
comment1 = Comment.objects.create(post=post)
comment2 = Comment.objects.create(post=post)
comment3 = Comment.objects.create(post=post)

@transaction.atomic
def rescore(node, new_score):
    node.score = score
    node.save()
    node.move(node)

# comment trees start with a root node w/ `comment=None`
# this would get created when the post is created
root = BestCommentTreeNode.add_root(post=post, score=0)
# top level comment
c1n = root.add_child(comment=comment1, score=1)
# replies to comment1
c2n = c1n.add_child(comment=comment1, score=4)
c3n = c1n.add_child(comment=comment1, score=5)

# c3n should list above c2n
print(root.dump_bulk())

rescore(c2n, 8)
# c2n is now sorted above c3n and has the updated score
print(root.dump_bulk())
```

This results 4 queries, two `SELECT ... LIMIT 1` and two `UPDATE ...` queries:

```sql
UPDATE "discussions_bestcommenttreenode" SET "path" = '000100010002', "depth" = 3, "numchild" = 0, "post_id" = 2, "comment_id" = 3, "score" = 8 WHERE "discussions_bestcommenttreenode"."id" = 5;
SELECT "discussions_bestcommenttreenode"."id", "discussions_bestcommenttreenode"."path", "discussions_bestcommenttreenode"."depth", "discussions_bestcommenttreenode"."numchild", "discussions_bestcommenttreenode"."post_id", "discussions_bestcommenttreenode"."comment_id", "discussions_bestcommenttreenode"."score" FROM "discussions_bestcommenttreenode" WHERE ("discussions_bestcommenttreenode"."depth" = 3 AND "discussions_bestcommenttreenode"."path" BETWEEN '000100010000' AND '00010001zzzz' AND "discussions_bestcommenttreenode"."score" > 8) ORDER BY "discussions_bestcommenttreenode"."path" ASC  LIMIT 1;
SELECT "discussions_bestcommenttreenode"."id", "discussions_bestcommenttreenode"."path", "discussions_bestcommenttreenode"."depth", "discussions_bestcommenttreenode"."numchild", "discussions_bestcommenttreenode"."post_id", "discussions_bestcommenttreenode"."comment_id", "discussions_bestcommenttreenode"."score" FROM "discussions_bestcommenttreenode" WHERE ("discussions_bestcommenttreenode"."depth" = 3 AND "discussions_bestcommenttreenode"."path" BETWEEN '000100010000' AND '00010001zzzz') ORDER BY "discussions_bestcommenttreenode"."path" DESC  LIMIT 1;
UPDATE "discussions_bestcommenttreenode" SET path='000100010005'||SUBSTR(path, 13) WHERE path LIKE '000100010002%';
```

### Votes

We should have a table for `PostVote` and `CommentVote`, these should have the following columns:

- `comment = ForeignKey(Comment)` / `post = ForeignKey(Post)` - item that was voted on
- `voter = ForeignKey(User)` - the user who made the vote
- `direction = SmallIntegerField()` - we store either a `1` or `-1` to indicate which direction the user voted. In practice, `PostVote` will always have a `direction == 1`, but it's useful to carve this out now in case that changes at a later date. It's also useful to be able to run a `SUM()` over that column.

Votes are probably the trickiest moving piece in this reddit migration because it's impractical to get the data directly from the reddit backend for a backpopulate. This probably means we're going to need either some kind of ETL process. This is only a 1-time event, so an approach as basic as an export/import of a CSV would be adequate.


### Reported Content

We need a data model for reported content (e.g. report post/comment to a moderator).

We need to support the following functionality:

- User can submit a report for a given post or comment
  - One record per post or comment is sufficient and likely desired since the moderator is only going to act on a post or comment once - additional records would superfluous.
  - We don't need to store the reason the user enters for the report
- Moderators can act on the report, the available actions are:
  - Approve: report is marked as resolved, post/comment remains visible
  - Ignore: report is marked as resolved, post/comment remains visible, subsequent reports are suppressed
  - Remove: report is marked as resolved, post/comment is removed and no longer visible, subsequent reports are suppressed

We don't need much data here, the following is sufficient:

- `GenericForeignKey` to `Post` / `Comment`
  - we should only create a new report if there is either no existing report or if an existing report is not resolved
  - We can accomplish this with a partial unique index combined with a `get_or_create` with `resolved_on=None`:
    ```python
    constraints = [UniqueConstraint(
      fields=["content_type", "content_id"],
      condition=Q(resolved_on=None)
    )]
    ```
- `resolved_on = DateTimeField(null=True)`
  - when a report is resolved, this is set the the current datetime, nullable datetimes have useful properties that we might want to take advantage of down the road
  - Additionally, if the action is to remove the item, that side effect occurs at this time as well
- `resolved_by = ForeignKey(User)` - probably useful to know who resolved it
- No need to pull in historial reports from reddit
