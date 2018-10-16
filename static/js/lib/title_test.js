// @flow
import { assert } from "chai"

import { formatTitle } from "./title"

describe("title lib", () => {
  it("should format the thing correctly", () => {
    assert.equal(
      "Create Channel | MIT Open Learning",
      formatTitle("Create Channel")
    )
  })
})
