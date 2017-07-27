// @flow
import React from "react"
import R from "ramda"
import moment from "moment"

import Card from "../components/Card"

import type { Comment } from "../flow/discussionTypes"

const renderTopLevelComment = (comment: Comment, idx: number) =>
  <Card key={idx}>
    <div className="top-level-comment">
      {renderComment(0, comment)}
    </div>
  </Card>

const renderComment = R.curry((depth: number, comment: Comment) =>
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
    <div className="replies">
      {R.map(renderComment(depth + 1), comment.replies)}
    </div>
  </div>
)

type CommentTreeProps = {
  comments: Array<Comment>
}

const CommentTree = ({ comments }: CommentTreeProps) =>
  <div className="comments">
    {R.addIndex(R.map)(renderTopLevelComment, comments)}
  </div>

export default CommentTree
