// @flow
import React from "react"

import LoginPopup from "./LoginPopup"
import { userIsAnonymous, votingTooltipText } from "../lib/util"
import type { CommentInTree } from "../flow/discussionTypes"


export type CommentVoteFunc = (comment: CommentInTree) => Promise<*>

type Props = {
  comment: CommentInTree,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc
}

type State = {
  downvoting: boolean,
  upvoting: boolean,
  popupVisible: boolean
}

export default class CommentVoteForm extends React.Component<Props, State> {
  constructor() {
    super()

    this.state = {
      downvoting:   false,
      upvoting:     false,
      popupVisible: false
    }
  }

  upvote = async () => {
    const { upvote, comment } = this.props

    this.setState({
      upvoting: true
    })
    await upvote(comment)
    this.setState({
      upvoting: false
    })
  }

  downvote = async () => {
    const { downvote, comment } = this.props

    this.setState({
      downvoting: true
    })
    await downvote(comment)
    this.setState({
      downvoting: false
    })
  }

  onTogglePopup = async () => {
    const { popupVisible } = this.state
    this.setState({
      popupVisible: !popupVisible
    })
  }

  render() {
    const { comment } = this.props
    const { upvoting, downvoting, popupVisible } = this.state

    const disabled = upvoting || downvoting

    // Use comment downvoted arrow, or if there's a downvote happening, show it as already downvoted.
    // Also make sure the upvote arrow is turned off if the downvote arrow is on.
    const downvoted = comment.downvoted !== downvoting && !upvoting
    const upvoted = comment.upvoted !== upvoting && !downvoting

    return (
      <div className="votes-form">
        <div className="score">{comment.score}</div>
        <button
          className={`vote upvote-button ${upvoted ? "upvoted" : ""}`}
          onClick={userIsAnonymous() ? this.onTogglePopup : this.upvote}
          disabled={disabled}
          data-tip
          data-for="comment-upvote-button"
        >
          <img
            className="vote-arrow"
            src={
              upvoted
                ? "/static/images/upvote_arrow_on.png"
                : "/static/images/upvote_arrow.png"
            }
            width="13"
          />
        </button>
        <span className="pipe">|</span>
        <button
          className={`vote downvote-button ${downvoted ? "downvoted" : ""}`}
          onClick={userIsAnonymous() ? this.onTogglePopup : this.downvote}
          disabled={disabled}
          data-for="comment-downvote-button"
        >
          <img
            className="vote-arrow"
            src={
              downvoted
                ? "/static/images/downvote_arrow_on.png"
                : "/static/images/downvote_arrow.png"
            }
            width="13"
          />
        </button>
        {userIsAnonymous() ? (
          <LoginPopup
            message={votingTooltipText}
            visible={popupVisible}
            closePopup={this.onTogglePopup}
          />
        ) : null}
      </div>
    )
  }
}
