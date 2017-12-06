// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { INITIAL_MODERATION_STATE } from "./moderation"
import {
  SET_MODERATING_COMMENT,
  CLEAR_MODERATING_COMMENT,
  setModeratingComment,
  clearModeratingComment
} from "../actions/moderation"
import { makeComment } from "../factories/comments"
import { makePost } from "../factories/posts"

describe("moderation reducer", () => {
  let helper, store, dispatchThen, comment

  beforeEach(() => {
    comment = makeComment(makePost())
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.moderation)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some default state", () => {
    assert.deepEqual(store.getState().moderation, INITIAL_MODERATION_STATE)
  })

  it("should let you set and clear the moderation comment", async () => {
    let state = await dispatchThen(setModeratingComment(comment), [
      SET_MODERATING_COMMENT
    ])
    assert.deepEqual(state.comment, comment)
    state = await dispatchThen(clearModeratingComment(), [
      CLEAR_MODERATING_COMMENT
    ])
    assert.isNull(state.comment)
  })
})
