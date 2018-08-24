// @flow
import React from "react"

import LoginPopup from "./LoginPopup"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"

import type { Post } from "../flow/discussionTypes"

type FollowProps = {
  post: Post,
  toggleFollowPost: Post => void
}

type FollowState = {
  popupVisible: boolean
}

export default class FollowButton extends React.Component<
  FollowProps,
  FollowState
> {
  constructor() {
    super()
    this.state = {
      popupVisible: false
    }
  }

  onTogglePopup = async () => {
    const { popupVisible } = this.state
    this.setState({
      popupVisible: !popupVisible
    })
  }

  render() {
    const { toggleFollowPost, post } = this.props
    const { popupVisible } = this.state
    return (
      <div>
        {post.subscribed ? (
          <div
            className="post-action subscribed"
            onClick={preventDefaultAndInvoke(() => {
              toggleFollowPost(post)
            })}
          >
            <i className="material-icons rss_feed">rss_feed</i>
            Unfollow
          </div>
        ) : (
          <div
            className="post-action unsubscribed"
            onClick={preventDefaultAndInvoke(() => {
              userIsAnonymous() ? this.onTogglePopup() : toggleFollowPost(post)
            })}
          >
            <i className="material-icons rss_feed">rss_feed</i>
            Follow
          </div>
        )}
        {userIsAnonymous() ? (
          <LoginPopup
            message="Sign up or Login to follow"
            visible={popupVisible}
            closePopup={this.onTogglePopup}
            className="reversed"
          />
        ) : null}
      </div>
    )
  }
}
