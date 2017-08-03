// @flow
import React from "react"
import R from "ramda"
import moment from "moment"

import Card from "../components/Card"
import { ReplyToCommentForm } from "../components/CreateCommentForm"

import type { Comment } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"

const renderTopLevelComment = R.curry((forms: FormsState, comment: Comment, idx: number) =>
  <Card key={idx}>
    <div className="top-level-comment">
      {renderComment(forms, 0, comment)}
    </div>
  </Card>
)

const renderComment = R.curry((forms: FormsState, depth: number, comment: Comment) =>
  <div className="comment" key={`${depth}${comment.created}`}>
    <div className="author-info">
      <a className="author-name">
        {comment.author_id}
      </a>
      <div>
        {moment(comment.created).fromNow()}
      </div>
    </div>
    <div>
      {comment.text}
    </div>
    <div>
      <ReplyToCommentForm forms={forms} comment={comment} />
    </div>
    <div className="replies">
      {R.map(renderComment(forms, depth + 1), comment.replies)}
    </div>
  </div>
)

type CommentTreeProps = {
  comments: Array<Comment>,
  forms: FormsState
}

const CommentTree = ({ comments, forms }: CommentTreeProps) =>
  <div className="comments">
    {R.addIndex(R.map)(renderTopLevelComment(forms), comments)}
  </div>

export default CommentTree
