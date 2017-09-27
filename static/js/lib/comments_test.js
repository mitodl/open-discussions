// @flow
import R from "ramda"
import { assert } from "chai"

import { findComment } from "./comments"
import { makePost } from "../factories/posts"
import { makeCommentTree } from "../factories/comments"

describe("comments lib functions", () => {
  let comments, post
  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post, 3)
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
})
