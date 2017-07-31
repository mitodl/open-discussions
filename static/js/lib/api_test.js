/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import { POST } from "redux-hammock/constants"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import { createChannel, getChannel, getFrontpage, getPost, getPostsForChannel, getComments, createComment } from "./api"
import { makeChannel } from "../factories/channels"
import { makeChannelPostList, makePost } from "../factories/posts"
import { makeCommentTree } from "../factories/comments"

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

    it("creates a channel", () => {
      const channel = makeChannel()
      fetchStub.returns(Promise.resolve(channel))

      const input = {
        name:               "name",
        title:              "title",
        public_description: "public_description",
        channel_type:       "public"
      }

      return createChannel(input).then(result => {
        assert.ok(
          fetchStub.calledWith(`/api/v0/channels/`, {
            method: POST,
            body:   JSON.stringify({
              ...input
            })
          })
        )
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

    it("gets comments for a post", () => {
      const post = makePost()
      const tree = makeCommentTree(post)
      fetchStub.returns(Promise.resolve(tree))

      return getComments(post.id).then(resp => {
        assert.deepEqual(resp.data, tree)
      })
    })

    it("creates comments for a post", () => {
      const post = makePost()
      fetchStub.returns(Promise.resolve())

      return createComment(post.id, "my new comment").then(() => {
        assert.ok(fetchStub.calledWith(`/api/v0/posts/${post.id}/comments/`))
        assert.deepEqual(fetchStub.args[0][1], {
          method: POST,
          body:   JSON.stringify({ text: "my new comment" })
        })
      })
    })

    it("creates commments replying to comments", () => {
      const post = makePost()
      const tree = makeCommentTree(post)
      fetchStub.returns(Promise.resolve())

      return createComment(post.id, "my new comment", tree[0].id).then(() => {
        assert.ok(fetchStub.calledWith(`/api/v0/posts/${post.id}/comments/`))
        assert.deepEqual(fetchStub.args[0][1], {
          method: POST,
          body:   JSON.stringify({
            text:       "my new comment",
            comment_id: tree[0].id
          })
        })
      })
    })
  })
})
