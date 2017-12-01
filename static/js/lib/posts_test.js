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
    const post = makePost()
    ;[
      [0, "0 comments"],
      [1, "1 comment"],
      [10, "10 comments"]
    ].forEach(([num, expectation]) => {
      post.num_comments = num
      assert.equal(formatCommentsCount(post), expectation)
    })
  })
})
