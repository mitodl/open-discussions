// @flow
import { createAction } from "redux-actions"

export const SET_FOCUSED_COMMENT = "SET_FOCUSED_COMMENT"
export const setFocusedComment = createAction<string, *>(SET_FOCUSED_COMMENT)

export const CLEAR_FOCUSED_COMMENT = "CLEAR_FOCUSED_COMMENT"
export const clearFocusedComment = createAction<string, *>(
  CLEAR_FOCUSED_COMMENT
)

export const SET_FOCUSED_POST = "SET_FOCUSED_POST"
export const setFocusedPost = createAction<string, *>(SET_FOCUSED_POST)

export const CLEAR_FOCUSED_POST = "CLEAR_FOCUSED_POST"
export const clearFocusedPost = createAction<string, *>(CLEAR_FOCUSED_POST)
