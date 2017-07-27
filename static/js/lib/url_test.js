// @flow
import { assert } from "chai"

import { channelURL, postDetailURL } from "./url"

describe("url helper functions", () => {
  describe("channelURL", () => {
    it("should return a good URL", () => {
      assert.equal(channelURL("foobar"), "/channel/foobar")
    })
  })

  describe("postDetailURL", () => {
    it("should return a good URL", () => {
      assert.equal(postDetailURL("foobar", "23434j3j3"), "/channel/foobar/23434j3j3")
    })
  })
})
