// @flow
import {
  SET_MODERATING_COMMENT,
  CLEAR_MODERATING_COMMENT
} from "../actions/moderation"

import type { Action } from "../flow/reduxTypes"
import type { CommentInTree } from "../flow/discussionTypes"

export type ModerationState = {
  comment: ?CommentInTree
}

export const INITIAL_MODERATION_STATE: ModerationState = {
  comment: null
}

export const moderation = (
  state: ModerationState = INITIAL_MODERATION_STATE,
  action: Action<any, null>
): ModerationState => {
  switch (action.type) {
  case SET_MODERATING_COMMENT:
    return { ...state, comment: action.payload }
  case CLEAR_MODERATING_COMMENT:
    return { ...state, comment: null }
  }
  return state
}
