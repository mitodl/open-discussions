// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { INITIAL_FOCUS_STATE } from "./focus"
import {
  SET_FOCUSED_COMMENT,
  CLEAR_FOCUSED_COMMENT,
  setFocusedComment,
  clearFocusedComment
} from "../actions/focus"
import { makeComment } from "../factories/comments"
import { makePost } from "../factories/posts"

describe("focus reducer", () => {
  let helper, store, dispatchThen, comment

  beforeEach(() => {
    comment = makeComment(makePost())
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

  it("should let you set and clear the moderation comment", async () => {
    let state = await dispatchThen(setFocusedComment(comment), [
      SET_FOCUSED_COMMENT
    ])
    assert.deepEqual(state.comment, comment)
    state = await dispatchThen(clearFocusedComment(), [CLEAR_FOCUSED_COMMENT])
    assert.isNull(state.comment)
  })
})
