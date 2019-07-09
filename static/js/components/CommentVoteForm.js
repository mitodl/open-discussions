// @flow
import React, { useState, useCallback } from "react"
import { useDispatch } from "react-redux"

import LoginTooltip from "./LoginTooltip"

import { actions } from "../actions"
import { userIsAnonymous } from "../lib/util"

import type { CommentInTree } from "../flow/discussionTypes"

type Props = {
  comment: CommentInTree
}

export default function CommentVoteForm(props: Props) {
  const { comment } = props

  const dispatch = useDispatch()
  const [upvoting, setUpvoting] = useState(false)
  const [downvoting, setDownvoting] = useState(false)

  const upvote = useCallback(
    async e => {
      e.preventDefault()
      setUpvoting(true)
      await dispatch(
        actions.comments.patch(comment.id, {
          upvoted: true
        })
      )
      setUpvoting(false)
    },
    [dispatch, setUpvoting]
  )

  const downvote = useCallback(
    async e => {
      e.preventDefault()
      setDownvoting(true)
      await dispatch(
        actions.comments.patch(comment.id, {
          downvoted: true
        })
      )
      setDownvoting(false)
    },
    [dispatch, setDownvoting]
  )

  const disabled = upvoting || downvoting

  // Use comment downvoted arrow, or if there's a downvote happening, show it as already downvoted.
  // Also make sure the upvote arrow is turned off if the downvote arrow is on.
  const downvoted = comment.downvoted !== downvoting && !upvoting
  const upvoted = comment.upvoted !== upvoting && !downvoting

  return (
    <div className="votes-form">
      <div className="score">{comment.score}</div>
      <LoginTooltip>
        <button
          className={`vote upvote-button ${upvoted ? "upvoted" : ""}`}
          onClick={userIsAnonymous() ? null : upvote}
          disabled={disabled}
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
      </LoginTooltip>
      <span className="pipe">|</span>
      <LoginTooltip>
        <button
          className={`vote downvote-button ${downvoted ? "downvoted" : ""}`}
          onClick={userIsAnonymous() ? null : downvote}
          disabled={disabled}
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
      </LoginTooltip>
    </div>
  )
}
