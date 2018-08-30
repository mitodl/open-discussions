// @flow
import React from "react"

import LoginPopup from "./LoginPopup"
import { userIsAnonymous, votingTooltipText } from "../lib/util"

import type { Post } from "../flow/discussionTypes"

type Props = {
  post: Post,
  toggleUpvote?: Function,
  showLoginMenu?: Function
}

type State = {
  upvoting: boolean,
  popupVisible: boolean
}

export default class PostUpvoteButton extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      upvoting:     false,
      popupVisible: false
    }
  }

  onToggleUpvote = async () => {
    const { toggleUpvote, post } = this.props
    if (toggleUpvote) {
      this.setState({
        upvoting: true
      })
      await toggleUpvote(post)
      this.setState({
        upvoting: false
      })
    }
  }

  onTogglePopup = () => {
    const { popupVisible } = this.state
    this.setState({
      popupVisible: !popupVisible
    })
  }

  render() {
    const { post } = this.props
    const { upvoting, popupVisible } = this.state
    const upvoted = post.upvoted !== upvoting
    const upvoteClass = upvoted ? "upvoted" : ""

    return (
      <React.Fragment>
        <div
          className={`post-upvote-button ${upvoteClass} grey-surround`}
          onClick={
            upvoting
              ? null
              : userIsAnonymous()
                ? this.onTogglePopup
                : this.onToggleUpvote
          }
        >
          <i className="material-icons arrow_upward">arrow_upward</i>
          <span className="votes">{post.score}</span>
        </div>
        {userIsAnonymous() ? (
          <LoginPopup
            message={votingTooltipText}
            visible={popupVisible}
            closePopup={this.onTogglePopup}
          />
        ) : null}
      </React.Fragment>
    )
  }
}
