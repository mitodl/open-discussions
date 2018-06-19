// @flow
import { assert } from "chai"

import { suggestEmail } from "./email"

describe("email utils", () => {
  describe("suggestEmail", () => {
    it("returns null if there is no suggestions", () => {
      assert.equal(suggestEmail("example@mit.edu"), null)
    })

    it("returns null if the only suggestion is the same email", async () => {
      assert.equal(
        suggestEmail("example@domainthatwillnevergetsuggested.com"),
        null
      )
    })

    it("results the suggestion suggestions", () => {
      assert.deepEqual(suggestEmail("example@mtt.edu"), {
        address: "example",
        domain:  "mit.edu",
        full:    "example@mit.edu"
      })
    })
  })
})
