// @flow
import { assert } from "chai"

import { newPostForm, formatCommentsCount } from "./posts"
import { makePost } from "../factories/posts"

describe("Post utils", () => {
  it("should return a new post with empty values", () => {
    assert.deepEqual(newPostForm(), {
      isText: true,
      text:   "",
      url:    "",
      title:  ""
    })
  })

  it("should correctly format comments", () => {
    let post = makePost()
    ;[
      [0, "0 Comments"],
      [1, "1 Comment"],
      [10, "10 Comments"]
    ].forEach(([num, expectation]) => {
      post.num_comments = num
      assert.equal(formatCommentsCount(post), expectation)
    })
  })
})
