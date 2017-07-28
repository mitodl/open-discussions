// @flow
import { assert } from "chai"

import { newPostForm } from "./posts"

describe("Post utils", () => {
  it("should return a new post with empty values", () => {
    assert.deepEqual(newPostForm(), {
      isText: true,
      text:   "",
      url:    "",
      title:  ""
    })
  })
})
