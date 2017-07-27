// @flow
import { assert } from "chai"
import moment from "moment"

import { makePost } from "./posts"
import { makeCommentTree } from "./comments"

describe("comment factories", () => {
  it("should make a tree of comments", () => {
    let post = makePost()
    makeCommentTree(post).forEach(comment => {
      assert.isNumber(comment.id)
      assert.equal(comment.post_id, post.id)
      assert.isString(comment.text)
      assert.isString(comment.author_id)
      assert.isNumber(comment.score)
      assert.isBoolean(comment.upvoted)
      assert.isString(comment.created)
      assert(moment(comment.created).isValid())
      assert.isArray(comment.replies)
    })
  })

  it("should always put replies on the first comment", () => {
    let [firstComment] = makeCommentTree(makePost())
    assert.isNotEmpty(firstComment.replies)
  })

  it("should have unique IDs", () => {
    let ids = makeCommentTree(makePost()).map(comment => comment.id)
    assert.equal(ids.length, new Set(ids).size)
  })
})
