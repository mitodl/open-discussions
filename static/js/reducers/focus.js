// @flow
import { createReducer } from "@reduxjs/toolkit"

import {
  setFocusedComment,
  clearFocusedComment,
  setFocusedPost,
  clearFocusedPost
} from "../actions/focus"

import type { CommentInTree, Post } from "../flow/discussionTypes"

export type FocusState = {
  comment: ?CommentInTree,
  post: ?Post
}

export const INITIAL_FOCUS_STATE: FocusState = {
  comment: null,
  post:    null
}

export const focus = createReducer(INITIAL_FOCUS_STATE, {
  // $FlowFixMe
  [setFocusedComment]: (state, action) => {
    state.comment = action.payload
  },
  // $FlowFixMe
  [clearFocusedComment]: state => {
    state.comment = null
  },
  // $FlowFixMe
  [setFocusedPost]: (state, action) => {
    state.post = action.payload
  },
  // $FlowFixMe
  [clearFocusedPost]: state => {
    state.post = null
  }
})
