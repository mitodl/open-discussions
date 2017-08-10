// @flow
import React from "react"

import type { Comment } from "../flow/discussionTypes"

export type CommentVoteFunc = (comment: Comment) => Promise<*>

type CommentVoteFormProps = {
  comment: Comment,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc
}

export default class CommentVoteForm extends React.Component {
  props: CommentVoteFormProps
  state: {
    voting: boolean
  }

  constructor() {
    super()

    this.state = {
      voting: false
    }
  }

  upvote = async () => {
    const { upvote, comment } = this.props

    this.setState({
      voting: true
    })
    await upvote(comment)
    this.setState({
      voting: false
    })
  }

  downvote = async () => {
    const { downvote, comment } = this.props

    this.setState({
      voting: true
    })
    await downvote(comment)
    this.setState({
      voting: false
    })
  }

  render() {
    const { comment } = this.props
    const { voting } = this.state

    return (
      <div className="votes-form">
        <div className="score">
          {comment.score}
        </div>
        <div className="votes">
          <button className={`vote upvote ${comment.upvoted ? "upvoted" : ""}`} onClick={this.upvote} disabled={voting}>
            ⇑
          </button>
          <button
            className={`vote downvote ${comment.downvoted ? "downvoted" : ""}`}
            onClick={this.downvote}
            disabled={voting}
          >
            ⇓
          </button>
        </div>
      </div>
    )
  }
}
