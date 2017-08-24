// @flow
import { assert } from "chai"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("post_upvotes reducer", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.updateUpvoteStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  for (const value of [true, false]) {
    it(`should let you update the post upvote value with ${value.toString()}`, () => {
      const { requestType, successType } = actions.postUpvotes.patch
      return helper
        .dispatchThen(actions.postUpvotes.patch("id", value), [
          requestType,
          successType
        ])
        .then(() => {
          assert.isOk(helper.updateUpvoteStub.calledWith("id", value))
        })
    })
  }
})
