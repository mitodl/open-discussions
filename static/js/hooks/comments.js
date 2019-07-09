// @flow
import { useCallback } from "react"
import { useDispatch } from "react-redux"

import { actions } from "../actions"
import * as apiActions from "../util/api_actions"
import { setSnackbarMessage } from "../actions/ui"

import type { CommentInTree, Post } from "../flow/discussionTypes"

export const useCommentModeration = (
  shouldGetReports: ?boolean,
  channelName: ?string
) => {
  const dispatch = useDispatch()

  const approveComment = useCallback(
    async (comment: CommentInTree) => {
      await apiActions.approveComment(dispatch, comment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
      dispatch(
        setSnackbarMessage({
          message: "Comment has been approved"
        })
      )
    },
    [dispatch]
  )

  const removeComment = useCallback(
    async (comment: CommentInTree) => {
      await apiActions.removeComment(dispatch, comment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }

      dispatch(
        setSnackbarMessage({
          message: "Comment has been removed"
        })
      )
    },
    [dispatch]
  )

  const ignoreReports = useCallback(
    async (comment: CommentInTree) => {
      await dispatch(
        actions.comments.patch(comment.id, { ignore_reports: true })
      )
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
    },
    [dispatch]
  )

  // ⚠️  this is a destructive action! ⚠️
  const deleteComment = useCallback(
    async (comment: CommentInTree, post: Post) => {
      await dispatch(actions.comments["delete"](post.id, comment.id))
      dispatch(
        setSnackbarMessage({
          message: "Comment has been deleted"
        })
      )
    },
    [dispatch]
  )

  return {
    ignoreReports,
    removeComment,
    approveComment,
    deleteComment
  }
}
