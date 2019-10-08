// @flow
import React from "react"

import LoginTooltip from "./LoginTooltip"
import { userIsAnonymous } from "../lib/util"

import type { Post } from "../flow/discussionTypes"

type Props = {
  post: Post,
  toggleUpvote?: Function
}

type State = {
  upvoting: boolean
}

export default class PostUpvoteButton extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      upvoting: false
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

  render() {
    const { post } = this.props
    const { upvoting } = this.state
    const upvoted = post.upvoted !== upvoting
    const upvoteClass = upvoted ? "upvoted" : ""

    return (
      <LoginTooltip>
        <div
          className={`post-upvote-button ${upvoteClass} grey-surround`}
          onClick={upvoting || userIsAnonymous() ? null : this.onToggleUpvote}
        >
          <i className="material-icons arrow_upward">arrow_upward</i>
          <span className="votes">{post.score}</span>
        </div>
      </LoginTooltip>
    )
  }
}
