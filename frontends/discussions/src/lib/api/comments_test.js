import sinon from "sinon"
import { assert } from "chai"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import { PATCH, POST, DELETE } from "redux-hammock/constants"
import R from "ramda"
import qs from "query-string"

import {
  getComments,
  getComment,
  createComment,
  updateComment,
  getMoreComments,
  deleteComment
} from "./comments"
import { makePost } from "../../factories/posts"
import {
  makeCommentsResponse,
  makeMoreCommentsResponse
} from "../../factories/comments"
import { COMMENT_SORT_NEW } from "../picker"

describe("Channels API", () => {
  let fetchJSONStub, fetchStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("getComments", () => {
    let post, response

    beforeEach(() => {
      post = makePost()
      response = makeCommentsResponse(post)
      fetchJSONStub.returns(Promise.resolve(response))
    })

    it("gets comments for a post", async () => {
      const resp = await getComments(post.id, {})
      assert.deepEqual(resp, response)
    })

    it("includes the sort parameter when getting comments", async () => {
      const resp = await getComments(post.id, { sort: COMMENT_SORT_NEW })
      assert.deepEqual(resp, response)
      assert.ok(
        fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/comments/?sort=new`)
      )
    })
  })

  it("gets a single comment", async () => {
    const post = makePost()
    const response = R.slice(0, 1, makeCommentsResponse(post))
    fetchJSONStub.returns(response)

    const resp = await getComment(post.id)
    assert.deepEqual(resp, response)
  })

  it("creates comments for a post", async () => {
    const post = makePost()
    fetchJSONStub.returns(Promise.resolve())

    await createComment(post.id, "my new comment")
    assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/comments/`))
    assert.deepEqual(fetchJSONStub.args[0][1], {
      method: POST,
      body:   JSON.stringify({ text: "my new comment" })
    })
  })

  it("creates comments replying to comments", async () => {
    const post = makePost()
    const tree = makeCommentsResponse(post)
    fetchJSONStub.returns(Promise.resolve())

    await createComment(post.id, "my new comment", tree[0].id)
    assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/comments/`))
    assert.deepEqual(fetchJSONStub.args[0][1], {
      method: POST,
      body:   JSON.stringify({
        text:       "my new comment",
        comment_id: tree[0].id
      })
    })
  })

  it("updates a comment", async () => {
    const post = makePost()
    const tree = makeCommentsResponse(post)
    const comment = tree[0]
    const commentResponse = { ...comment, replies: undefined, text: "edited" }

    fetchJSONStub.returns(Promise.resolve(commentResponse))

    const payload = {
      text:      "edited",
      downvoted: true
    }
    const updated = await updateComment(comment.id, payload)
    assert.ok(fetchJSONStub.calledWith(`/api/v0/comments/${comment.id}/`))
    assert.deepEqual(updated, commentResponse)
    assert.deepEqual(fetchJSONStub.args[0][1], {
      method: PATCH,
      body:   JSON.stringify(payload)
    })
  })

  it("deletes a comment", async () => {
    const comment = makeCommentsResponse(makePost())[0]
    fetchStub.returns(Promise.resolve())

    await deleteComment(comment.id)
    assert.ok(
      fetchStub.calledWith(`/api/v0/comments/${comment.id}/`, {
        method: DELETE
      })
    )
  })

  describe("retrieves more comments", () => {
    it("at the root level", async () => {
      const post = makePost()
      const moreComments = makeMoreCommentsResponse(post)
      const children = ["some", "child", "ren"]

      fetchJSONStub.returns(Promise.resolve(moreComments))

      const response = await getMoreComments(post.id, null, children)
      const payload = {
        post_id:  post.id,
        children: children
      }
      assert.ok(
        fetchJSONStub.calledWith(
          `/api/v0/morecomments/?${qs.stringify(payload)}`
        )
      )
      assert.deepEqual(response, moreComments)
    })

    it("replying to a parent", async () => {
      const post = makePost()
      const commentsResponse = makeCommentsResponse(post)
      const parent = commentsResponse[0]
      const moreComments = makeMoreCommentsResponse(post, parent.id)
      const children = ["some", "child", "ren"]

      fetchJSONStub.returns(Promise.resolve(moreComments))

      const response = await getMoreComments(post.id, parent.id, children)
      const payload = {
        post_id:   post.id,
        parent_id: parent.id,
        children:  children
      }
      assert.ok(
        fetchJSONStub.calledWith(
          `/api/v0/morecomments/?${qs.stringify(payload)}`
        )
      )
      assert.deepEqual(response, moreComments)
    })
  })
})
