// @flow
import { SET_FOCUSED_COMMENT, CLEAR_FOCUSED_COMMENT } from "../actions/focus"

import type { Action } from "../flow/reduxTypes"
import type { CommentInTree } from "../flow/discussionTypes"

export type FocusState = {
  comment: ?CommentInTree
}

export const INITIAL_FOCUS_STATE: FocusState = {
  comment: null
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
  }
  return state
}
