import { assert } from "chai"
import moment from "moment"

import { makePost } from "./posts"
import { makeCommentsResponse } from "./comments"

describe("comment factories", () => {
  it("should make a tree of comments", () => {
    const post = makePost()
    makeCommentsResponse(post).forEach(comment => {
      assert.isString(comment.id)
      assert.equal(comment.post_id, post.id)
      assert.isString(comment.text)
      assert.isString(comment.author_id)
      assert.isNumber(comment.score)
      assert.isBoolean(comment.upvoted)
      assert.isBoolean(comment.removed)
      assert.isString(comment.created)
      assert(moment(comment.created).isValid())
      assert.isArray(comment.replies)
      assert.isString(comment.profile_image)
      assert.isString(comment.author_name)
      assert.isBoolean(comment.edited)
      assert.isBoolean(comment.subscribed)
    })
  })

  it("should always put replies on the first comment", () => {
    const comments = makeCommentsResponse(makePost())
    const firstComment = comments[0]
    assert.isOk(comments.find(comment => firstComment.id === comment.parent_id))
  })

  it("should have unique IDs", () => {
    const ids = makeCommentsResponse(makePost()).map(comment => comment.id)
    assert.equal(ids.length, new Set(ids).size)
  })
})
