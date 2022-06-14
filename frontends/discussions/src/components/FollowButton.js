// @flow
import React from "react"

import LoginTooltip from "./LoginTooltip"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"

import type { Post } from "../flow/discussionTypes"

type Props = {
  post: Post,
  toggleFollowPost: Post => void
}

const FollowButton = ({ toggleFollowPost, post }: Props) => (
  <LoginTooltip>
    {post.subscribed ? (
      <div
        className="post-action subscribed grey-surround"
        onClick={preventDefaultAndInvoke(() => {
          toggleFollowPost(post)
        })}
      >
        <i className="material-icons rss_feed">rss_feed</i>
        <span>Unfollow</span>
      </div>
    ) : (
      <div
        className="post-action unsubscribed grey-surround"
        onClick={preventDefaultAndInvoke(() => {
          userIsAnonymous() ? null : toggleFollowPost(post)
        })}
      >
        <i className="material-icons rss_feed">rss_feed</i>
        <span>Follow</span>
      </div>
    )}
  </LoginTooltip>
)

export default FollowButton
