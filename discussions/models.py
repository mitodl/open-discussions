from django.db import models
from treebeard.mp_tree import MP_Node

from open_discussions.models import TimestampedModel


class Channel(TimestampedModel):
    pass


class Post(TimestampedModel):
    channel = models.ForeignKey("discussions.Channel", on_delete=models.CASCADE)


class Comment(TimestampedModel):
    post = models.ForeignKey("discussions.Post", on_delete=models.CASCADE)


class CommentTreeNode(MP_Node):
    # specialize the alphabet for postgres
    # see: https://django-treebeard.readthedocs.io/en/latest/mp_tree.html#treebeard.mp_tree.MP_Node.alphabet
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    # a post can have many comments, but a reverse lookup into this tree isn't pragmatic
    post = models.ForeignKey(
        "discussions.Post", on_delete=models.CASCADE, related_name="+"
    )

    class Meta:
        abstract = True


class NewCommentTreeNode(CommentTreeNode):
    comment = models.OneToOneField(
        "discussions.Comment",
        on_delete=models.CASCADE,
        unique=True,
        null=True,
        related_name="new_comment_node",
    )

    created = models.DateTimeField()

    node_order_by = ["-created"]


class OldCommentTreeNode(CommentTreeNode):
    comment = models.OneToOneField(
        "discussions.Comment",
        on_delete=models.CASCADE,
        unique=True,
        null=True,
        related_name="old_comment_node",
    )

    created = models.DateTimeField()

    node_order_by = ["created"]


class BestCommentTreeNode(CommentTreeNode):
    comment = models.OneToOneField(
        "discussions.Comment",
        on_delete=models.CASCADE,
        unique=True,
        null=True,
        related_name="best_comment_node",
    )

    score = models.IntegerField()

    node_order_by = ["-score"]


class Vote(models.Model):

    direction = models.SmallIntegerField()

    class Meta:
        abstract = True


class PostVote(Vote):
    post = models.ForeignKey("discussions.Post", on_delete=models.CASCADE)


class CommentVote(Vote):
    comment = models.ForeignKey("discussions.Comment", on_delete=models.CASCADE)
