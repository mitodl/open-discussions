// @flow
import React from "react"

import type { Comment } from "../flow/discussionTypes"

export type CommentVoteFunc = (comment: Comment) => void

type CommentVoteFormProps = {
  comment: Comment,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc
}

export default class CommentVoteForm extends React.Component {
  props: CommentVoteFormProps

  render() {
    const { comment, upvote, downvote } = this.props

    return (
      <div className="votes-form">
        <div className="score">
          {comment.score}
        </div>
        <div className="votes">
          <button className={`vote upvote ${comment.upvoted ? "upvoted" : ""}`} onClick={() => upvote(comment)}>
            ⇑
          </button>
          <button className={`vote downvote ${comment.downvoted ? "downvoted" : ""}`} onClick={() => downvote(comment)}>
            ⇓
          </button>
        </div>
      </div>
    )
  }
}
