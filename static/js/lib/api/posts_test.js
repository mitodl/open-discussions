// @flow
import R from "ramda"
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
    const result = await createPost("channelname", { text, title, url })
    const body = objectToFormData({ url, text, title })
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
      coverImage,
      article
    })
    const body = objectToFormData({ title, coverImage, article })
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

  it("updates a post", async () => {
    const post = makePost()

    fetchJSONStub.returns(Promise.resolve())

    post.text = "updated!"

    await editPost(post.id, post)

    assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/`))
    assert.deepEqual(fetchJSONStub.args[0][1], {
      method: PATCH,
      body:   JSON.stringify(R.dissoc("url", post))
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
