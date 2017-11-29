/* global SETTINGS */
import { assert } from "chai"

import { addEditedMarker } from "./reddit_objects"
import { makeCommentsResponse } from "../factories/comments"
import { makePost } from "../factories/posts"
import { createCommentTree } from "../reducers/comments"

describe("addEditedMarker", () => {
  let comment, post

  beforeEach(() => {
    post = makePost()
    comment = createCommentTree(makeCommentsResponse(post))[0]
  })

  it("should leave things alone if not edited", () => {
    comment.edited = false
    assert.equal(comment.text, addEditedMarker(comment))
  })

  it("should add a marker if edited", () => {
    comment.edited = true
    assert.ok(addEditedMarker(comment).endsWith(" _[edited by author]_"))
  })
})
