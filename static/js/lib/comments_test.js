import R from "ramda"
import { assert } from "chai"

import { findComment, flattenCommentTree } from "./comments"
import { makePost } from "../factories/posts"
import { makeCommentsResponse } from "../factories/comments"
import { createCommentTree } from "../reducers/comments"

describe("comments lib functions", () => {
  let comments, post
  beforeEach(() => {
    post = makePost()
    comments = createCommentTree(makeCommentsResponse(post, 3))
  })

  it("finds a root comment", () => {
    const root = comments[1]
    assert(root, "missing comment")
    const lens = findComment(comments, root.id)
    assert.deepEqual(R.view(lens, comments), root)
  })

  it("finds a nested comment", () => {
    const root = comments[0]
    const firstChild = root.replies[0]
    const secondChild = firstChild.replies[2]
    assert(secondChild, "missing comment")
    const lens = findComment(comments, secondChild.id)
    assert.deepEqual(R.view(lens, comments), secondChild)
  })

  it("can't find the comment", () => {
    const lens = findComment(comments, "not_a_comment_id")
    assert.isNull(lens)
  })

  it("flattens the tree", () => {
    const flattened = flattenCommentTree(comments)
    flattened.forEach(comment => {
      assert.deepEqual(comment.replies, [])
    })
    const allIDs = flattened.map(R.prop("id"))
    comments[0].replies.map(R.prop("id")).forEach(id => {
      assert.include(allIDs, id)
    })
  })
})
