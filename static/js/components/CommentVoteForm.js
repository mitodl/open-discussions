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
        <button
          className={`vote upvote-button ${comment.upvoted ? "upvoted" : ""}`}
          onClick={this.upvote}
          disabled={voting}
        >
          <img className="vote-arrow" src="/static/images/upvote_arrow.png" />
        </button>
        <button
          className={`vote downvote-button ${comment.downvoted
            ? "downvoted"
            : ""}`}
          onClick={this.downvote}
          disabled={voting}
        >
          <img className="vote-arrow" src="/static/images/downvote_arrow.png" />
        </button>
      </div>
    )
  }
}
