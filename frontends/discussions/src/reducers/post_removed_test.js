// @flow
import { assert } from "chai"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("post_removed reducer", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.updateRemovedStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  for (const value of [true, false]) {
    it(`should let you update the post removed value with ${value.toString()}`, () => {
      const { requestType, successType } = actions.postRemoved.patch
      return helper
        .dispatchThen(actions.postRemoved.patch("id", value), [
          requestType,
          successType
        ])
        .then(() => {
          assert.isOk(helper.updateRemovedStub.calledWith("id", value))
        })
    })
  }
})
