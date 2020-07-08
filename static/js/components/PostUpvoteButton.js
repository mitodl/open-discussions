// @flow
import React, { useCallback, useState } from "react"
import { useDispatch } from "react-redux"

import LoginTooltip from "./LoginTooltip"

import { userIsAnonymous } from "../lib/util"
import { actions } from "../actions"
import { setPostData } from "../actions/post"

import type { Post } from "../flow/discussionTypes"

type Props = {
  post: Post
}

export default function PostUpvoteButton(props: Props) {
  const { post } = props
  const [upvoting, setUpvoting] = useState(false)

  const upvoted = post.upvoted !== upvoting
  const upvoteClass = upvoted ? "upvoted" : ""

  const dispatch = useDispatch()

  const toggleUpvote = useCallback(
    async e => {
      e.preventDefault()
      setUpvoting(true)
      const result = await dispatch(
        actions.postUpvotes.patch(post.id, !post.upvoted)
      )
      dispatch(setPostData(result))
      setUpvoting(false)
    },
    [dispatch, post]
  )

  return (
    <LoginTooltip>
      <div
        className={`post-upvote-button ${upvoteClass} grey-surround`}
        onClick={upvoting || userIsAnonymous() ? null : toggleUpvote}
      >
        <i className="material-icons arrow_upward">arrow_upward</i>
        <span className="votes">{post.score}</span>
      </div>
    </LoginTooltip>
  )
}
