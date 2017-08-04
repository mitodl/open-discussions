// @flow
import React from "react"
import R from "ramda"
import moment from "moment"

import Card from "./Card"
import { ReplyToCommentForm } from "./CreateCommentForm"
import CommentVoteForm from "./CommentVoteForm"

import type { Comment } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { CommentVoteFunc } from "./CommentVoteForm"

const renderTopLevelComment = R.curry(
  (forms: FormsState, upvote: CommentVoteFunc, downvote: CommentVoteFunc, comment: Comment, idx: number) =>
    <Card key={idx}>
      <div className="top-level-comment">
        {renderComment(forms, upvote, downvote, 0, comment)}
      </div>
    </Card>
)

const renderComment = R.curry(
  (forms: FormsState, upvote: CommentVoteFunc, downvote: CommentVoteFunc, depth: number, comment: Comment) =>
    <div className="comment" key={comment.id}>
      <div className="author-info">
        <a className="author-name">
          {comment.author_id}
        </a>
        <div>
          {moment(comment.created).fromNow()}
        </div>
      </div>
      <div className="row">
        <CommentVoteForm comment={comment} upvote={upvote} downvote={downvote} />
        <div>
          {comment.text}
        </div>
      </div>
      <div>
        <ReplyToCommentForm forms={forms} comment={comment} />
      </div>
      <div className="replies">
        {R.map(renderComment(forms, upvote, downvote, depth + 1), comment.replies)}
      </div>
    </div>
)

type CommentTreeProps = {
  comments: Array<Comment>,
  forms: FormsState,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc
}

const CommentTree = ({ comments, forms, upvote, downvote }: CommentTreeProps) =>
  <div className="comments">
    {R.addIndex(R.map)(renderTopLevelComment(forms, upvote, downvote), comments)}
  </div>

export default CommentTree
