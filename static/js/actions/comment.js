// @flow
import { createAction } from "redux-actions"

export const REPLACE_MORE_COMMENTS = "REPLACE_MORE_COMMENTS"
export const replaceMoreComments = createAction<string, *>(
  REPLACE_MORE_COMMENTS
)

export const CLEAR_COMMENT_ERROR = "CLEAR_COMMENT_ERROR"
export const clearCommentError = createAction<string, *>(CLEAR_COMMENT_ERROR)
