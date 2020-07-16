// @flow
/* global SETTINGS:false */
import React, { useState, useCallback } from "react"
import { useDispatch } from "react-redux"

import LoginTooltip from "./LoginTooltip"

import { actions } from "../actions"
import { userIsAnonymous } from "../lib/util"
import { setBannerMessage } from "../actions/ui"

import type { CommentInTree } from "../flow/discussionTypes"

type Props = {
  comment: CommentInTree
}

export default function CommentVoteForm(props: Props) {
  const { comment } = props

  const dispatch = useDispatch()
  const [upvoting, setUpvoting] = useState(false)
  const [downvoting, setDownvoting] = useState(false)

  const showErrorBanner = useCallback(
    gerund => {
      dispatch(
        setBannerMessage(
          `Something went wrong ${gerund} this comment. Contact us at ${
            SETTINGS.support_email
          }`
        )
      )
    },
    [dispatch]
  )

  const upvote = useCallback(
    async e => {
      e.preventDefault()
      setUpvoting(true)
      try {
        await dispatch(
          actions.comments.patch(comment.id, {
            upvoted:   !comment.upvoted,
            downvoted: false
          })
        )
      } catch (_) {
        showErrorBanner("upvoting")
      }
      setUpvoting(false)
    },
    [dispatch, setUpvoting, comment]
  )

  const downvote = useCallback(
    async e => {
      e.preventDefault()
      setDownvoting(true)
      try {
        await dispatch(
          actions.comments.patch(comment.id, {
            downvoted: !comment.downvoted,
            upvoted:   false
          })
        )
      } catch (_) {
        showErrorBanner("downvoting")
      }
      setDownvoting(false)
    },
    [dispatch, setDownvoting, comment]
  )

  const disabled = upvoting || downvoting

  // Use comment downvoted arrow, or if there's a downvote happening, show it as already downvoted.
  // Also make sure the upvote arrow is turned off if the downvote arrow is on.
  const downvoted = comment.downvoted !== downvoting && !upvoting
  const upvoted = comment.upvoted !== upvoting && !downvoting

  // here we create an optimistic score based on assuming that the action in
  // progress (if any) will succeed
  let { score } = comment
  if (upvoting) {
    if (comment.upvoted) {
      // comment was already upvoted, so clicking 'upvote' drops score by 1
      score = score - 1
    } else if (comment.downvoted) {
      // comment was downvoted, so upvoting bumps score by 2
      score = score + 2
    } else {
      // else, the user hasn't voted on the comment, so score bumps by 1
      score = score + 1
    }
  }

  if (downvoting) {
    if (comment.downvoted) {
      // comment already downvoted, so clicking 'downvote' bumps by 1
      score = score + 1
    } else if (comment.upvoted) {
      // comment was upvoted, so score drops by 2
      score = score - 2
    } else {
      // comment wasn't voted on yet
      score = score - 1
    }
  }

  return (
    <div className="votes-form">
      <div className="score">
        {SETTINGS.username === comment.author_id ? comment.score : score}
      </div>
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
