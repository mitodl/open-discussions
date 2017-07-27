/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import { getChannel, getFrontpage, getPost, getPostsForChannel } from "./api"
import { makeChannel } from "../factories/channels"
import { makeChannelPostList, makePost } from "../factories/posts"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

describe("api", function() {
  this.timeout(5000) // eslint-disable-line no-invalid-this

  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })
  afterEach(function() {
    sandbox.restore()

    for (let cookie of document.cookie.split(";")) {
      let key = cookie.split("=")[0].trim()
      document.cookie = `${key}=`
    }
  })

  describe("REST functions", () => {
    let fetchStub
    beforeEach(() => {
      fetchStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    })

    it("gets channel posts", () => {
      const posts = makeChannelPostList()
      fetchStub.returns(Promise.resolve(posts))

      return getPostsForChannel("channelone").then(result => {
        assert.ok(fetchStub.calledWith("/api/v0/channels/channelone/posts/"))
        assert.deepEqual(result, posts)
      })
    })

    it("gets channel", () => {
      const channel = makeChannel()
      fetchStub.returns(Promise.resolve(channel))

      return getChannel("channelone").then(result => {
        assert.ok(fetchStub.calledWith("/api/v0/channels/channelone/"))
        assert.deepEqual(result, channel)
      })
    })

    it("gets post", () => {
      const post = makePost()
      fetchStub.returns(Promise.resolve(post))

      return getPost("1").then(result => {
        assert.ok(fetchStub.calledWith(`/api/v0/posts/1/`))
        assert.deepEqual(result, post)
      })
    })

    it("gets the frontpage", () => {
      const posts = makeChannelPostList()
      fetchStub.returns(Promise.resolve(posts))

      return getFrontpage().then(result => {
        assert.ok(fetchStub.calledWith(`/api/v0/frontpage/`))
        assert.deepEqual(result, posts)
      })
    })
  })
})
