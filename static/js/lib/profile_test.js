/* global SETTINGS */
import { assert } from "chai"
import { initials } from "./profile"

describe("initials", () => {
  it("should return capitalized first letter of first two words", () => {
    [
      ["Test user", "TU"],
      ["testuser", "T"],
      ["test Thurston Howell III", "TT"],
      ["", ""]
    ].forEach(([name, expected]) => {
      assert.equal(initials(name), expected)
    })
  })
})
