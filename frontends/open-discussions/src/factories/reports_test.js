import { assert } from "chai"

import { makeCommentReport, makePostReport } from "./reports"
import { makePost } from "./posts"

describe("reports factories", () => {
  it("should make a comment report", () => {
    const post = makePost()
    const commentReport = makeCommentReport(post)
    assert.equal(commentReport.comment.post_id, post.id)
    assert.isNull(commentReport.post)
    assert.lengthOf(commentReport.reasons, 2)
    commentReport.reasons.forEach(assert.isString)
  })

  it("should make a post report", () => {
    const postReport = makePostReport()
    assert.isNull(postReport.comment)
    postReport.reasons.forEach(assert.isString)
  })

  it("should take an optional post param for a post report", () => {
    const post = makePost()
    const postReport = makePostReport(post)
    assert.equal(postReport.post.id, post.id)
  })
})
