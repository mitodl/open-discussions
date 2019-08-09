// @flow
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import { PATCH, POST } from "redux-hammock/constants"
import { assert } from "chai"

import { makePost } from "../../factories/posts"
import {
  createPost,
  getPost,
  deletePost,
  editPost,
  updateRemoved
} from "./posts"
import { objectToFormData } from "../../lib/forms"

describe("Post API", () => {
  let fetchJSONStub, fetchStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("creates a post", async () => {
    const post = makePost()
    post.score = 1
    fetchStub.returns(Promise.resolve(JSON.stringify(post)))

    const text = "Text"
    const title = "Title"
    const url = "URL"
    const result = await createPost("channelname", { text, url, title })
    const body = objectToFormData({ text, url, title })
    sinon.assert.calledWith(fetchStub, "/api/v0/channels/channelname/posts/", {
      body,
      method: POST
    })
    assert.deepEqual(result, post)
  })

  it("creates a post with a coverImage", async () => {
    const post = makePost()
    post.score = 1
    fetchStub.returns(Promise.resolve(JSON.stringify(post)))

    const title = "Title"
    const article = [{ an: "article" }]
    const coverImage = new File([], "asdf.jpg")
    const result = await createPost("channelname", {
      title,
      cover_image:     coverImage,
      article_content: article
    })
    const body = objectToFormData({
      title,
      article_content: JSON.stringify(article),
      cover_image:     coverImage
    })

    sinon.assert.calledWith(fetchStub, "/api/v0/channels/channelname/posts/", {
      body,
      method: POST
    })
    assert.deepEqual(result, post)
  })

  it("gets post", async () => {
    const post = makePost()
    fetchJSONStub.returns(Promise.resolve(post))

    const result = await getPost("1")
    assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/1/`))
    assert.deepEqual(result, post)
  })

  it("deletes a post", async () => {
    const post = makePost()
    fetchStub.returns(Promise.resolve())

    await deletePost(post.id)
    assert.ok(fetchStub.calledWith(`/api/v0/posts/${post.id}/`))
  })

  //
  ;[
    ["text", "text"],
    ["title", "title"],
    ["stickied", true],
    ["ignore_reports", true],
    ["subscribed", true]
  ].forEach(([fieldName, val]) => {
    it(`lets you update the ${fieldName} field on a post`, async () => {
      const post = makePost(false)
      fetchStub.returns(Promise.resolve(JSON.stringify(post)))
      await editPost(post.id, { [fieldName]: val })
      const bodyExp = objectToFormData({ [fieldName]: val })
      assert.ok(fetchStub.calledWith(`/api/v0/posts/${post.id}/`))
      const { method, body } = fetchStub.args[0][1]
      assert.equal(method, PATCH)
      assert.deepEqual([...body.entries()], [...bodyExp.entries()])
    })
  })

  //
  ;[true, false].forEach(status => {
    it(`updates post removed: ${String(status)}`, async () => {
      const post = makePost()

      fetchJSONStub.returns(Promise.resolve())

      await updateRemoved(post.id, status)

      assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/`))
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: PATCH,
        body:   JSON.stringify({
          removed: status
        })
      })
    })
  })
})
