// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"

describe("reducers", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  // Tests for discussion-related reducers removed as part of Phase 1 cleanup
  it("placeholder test", () => {
    assert.ok(true)
  })
})
