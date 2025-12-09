// @flow
import { actions } from "../actions"

import type { CommentInTree } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

export const approveComment = async (
  dispatch: Dispatch<*>,
  comment: CommentInTree
) =>
  dispatch(
    actions.comments.patch(comment.id, {
      removed: false
    })
  )

export const removeComment = async (
  dispatch: Dispatch<*>,
  comment: CommentInTree
) =>
  dispatch(
    actions.comments.patch(comment.id, {
      removed: true
    })
  )
