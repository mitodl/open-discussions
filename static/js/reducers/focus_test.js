// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { INITIAL_FOCUS_STATE } from "./focus"
import {
  SET_FOCUSED_COMMENT,
  CLEAR_FOCUSED_COMMENT,
  setFocusedComment,
  clearFocusedComment,
  SET_FOCUSED_POST,
  CLEAR_FOCUSED_POST,
  setFocusedPost,
  clearFocusedPost
} from "../actions/focus"
import { makeComment } from "../factories/comments"
import { makePost } from "../factories/posts"

describe("focus reducer", () => {
  let helper, store, dispatchThen, comment, post

  beforeEach(() => {
    post = makePost()
    comment = makeComment(post)
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.focus)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some default state", () => {
    assert.deepEqual(store.getState().focus, INITIAL_FOCUS_STATE)
  })

  it("should let you set and clear the focused comment", async () => {
    let state = await dispatchThen(setFocusedComment(comment), [
      SET_FOCUSED_COMMENT
    ])
    assert.deepEqual(state.comment, comment)
    state = await dispatchThen(clearFocusedComment(), [CLEAR_FOCUSED_COMMENT])
    assert.isNull(state.comment)
  })

  it("should let you set and clear the focused post", async () => {
    let state = await dispatchThen(setFocusedPost(post), [SET_FOCUSED_POST])
    assert.deepEqual(state.post, post)
    state = await dispatchThen(clearFocusedPost(), [CLEAR_FOCUSED_POST])
    assert.isNull(state.post)
  })
})
