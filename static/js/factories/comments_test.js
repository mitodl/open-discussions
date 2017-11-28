// @flow
import { assert } from "chai"
import moment from "moment"

import { makePost } from "./posts"
import { makeCommentTree } from "./comments"

describe("comment factories", () => {
  it("should make a tree of comments", () => {
    const post = makePost()
    makeCommentTree(post).forEach(comment => {
      assert.isString(comment.id)
      assert.equal(comment.post_id, post.id)
      assert.isString(comment.text)
      assert.isString(comment.author_id)
      assert.isNumber(comment.score)
      assert.isBoolean(comment.upvoted)
      assert.isString(comment.created)
      assert(moment(comment.created).isValid())
      assert.isArray(comment.replies)
      assert.isString(comment.profile_image)
      assert.isString(comment.author_name)
      assert.isBoolean(comment.edited)
    })
  })

  it("should always put replies on the first comment", () => {
    const [firstComment] = makeCommentTree(makePost())
    assert.isNotEmpty(firstComment.replies)
  })

  it("should have unique IDs", () => {
    const ids = makeCommentTree(makePost()).map(comment => comment.id)
    assert.equal(ids.length, new Set(ids).size)
  })
})
