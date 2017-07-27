// @flow
import { assert } from "chai"

import { postDetailURL } from "./url"

describe("url helper functions", () => {
  describe("postDetailURL", () => {
    it("should return a good URL", () => {
      assert.equal(postDetailURL("foobar", "23434j3j3"), "/channel/foobar/23434j3j3")
    })
  })
})
