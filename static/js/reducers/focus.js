// @flow
import {
  SET_FOCUSED_COMMENT,
  CLEAR_FOCUSED_COMMENT,
  SET_FOCUSED_POST,
  CLEAR_FOCUSED_POST
} from "../actions/focus"

import type { Action } from "../flow/reduxTypes"
import type { CommentInTree, Post } from "../flow/discussionTypes"

export type FocusState = {
  comment: ?CommentInTree,
  post: ?Post
}

export const INITIAL_FOCUS_STATE: FocusState = {
  comment: null,
  post:    null
}

export const focus = (
  state: FocusState = INITIAL_FOCUS_STATE,
  action: Action<any, null>
): FocusState => {
  switch (action.type) {
  case SET_FOCUSED_COMMENT:
    return { ...state, comment: action.payload }
  case CLEAR_FOCUSED_COMMENT:
    return { ...state, comment: null }
  case SET_FOCUSED_POST:
    return { ...state, post: action.payload }
  case CLEAR_FOCUSED_POST:
    return { ...state, post: null }
  }
  return state
}
