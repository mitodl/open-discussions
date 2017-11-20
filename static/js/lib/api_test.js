/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import { PATCH, POST } from "redux-hammock/constants"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import R from "ramda"

import {
  createChannel,
  getChannel,
  getChannels,
  getFrontpage,
  getPost,
  getPostsForChannel,
  getComments,
  createComment,
  createPost,
  updateComment,
  editPost
} from "./api"
import { makeChannel, makeChannelList } from "../factories/channels"
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

    for (const cookie of document.cookie.split(";")) {
      const key = cookie.split("=")[0].trim()
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
      fetchStub.returns(Promise.resolve({ posts }))

      return getPostsForChannel("channelone", {}).then(result => {
        assert.ok(fetchStub.calledWith("/api/v0/channels/channelone/posts/"))
        assert.deepEqual(result.posts, posts)
      })
    })

    it("gets channel posts with pagination params", () => {
      const posts = makeChannelPostList()
      fetchStub.returns(Promise.resolve({ posts }))

      return getPostsForChannel("channelone", {
        before: "abc",
        after:  "def",
        count:  5
      }).then(result => {
        assert.ok(
          fetchStub.calledWith(
            `/api/v0/channels/channelone/posts/?after=def&before=abc&count=5`
          )
        )
        assert.deepEqual(result.posts, posts)
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

    it("gets a list of channels", () => {
      const channelList = makeChannelList()
      fetchStub.returns(Promise.resolve(channelList))

      return getChannels().then(result => {
        assert.ok(fetchStub.calledWith("/api/v0/channels/"))
        assert.deepEqual(result, channelList)
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

    it("creates a post", () => {
      const post = makePost()
      fetchStub.returns(Promise.resolve(post))

      const text = "Text"
      const title = "Title"
      const url = "URL"
      return createPost("channelname", { text, title, url }).then(result => {
        const body = JSON.stringify({ url, text, title })
        sinon.assert.calledWith(
          fetchStub,
          "/api/v0/channels/channelname/posts/",
          {
            body,
            method: POST
          }
        )
        assert.deepEqual(result, post)
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
      fetchStub.returns(Promise.resolve({ posts }))

      return getFrontpage({}).then(result => {
        assert.ok(fetchStub.calledWith(`/api/v0/frontpage/`))
        assert.deepEqual(result.posts, posts)
      })
    })

    it("gets the frontpage with pagination params", () => {
      const posts = makeChannelPostList()
      fetchStub.returns(Promise.resolve({ posts }))

      return getFrontpage({
        before: "abc",
        after:  "def",
        count:  5
      }).then(result => {
        assert.ok(
          fetchStub.calledWith(
            `/api/v0/frontpage/?after=def&before=abc&count=5`
          )
        )
        assert.deepEqual(result.posts, posts)
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

    it("creates comments replying to comments", () => {
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

    it("updates a comment", () => {
      const post = makePost()
      const tree = makeCommentTree(post)
      const comment = tree[0]
      const commentResponse = { ...comment, replies: undefined, text: "edited" }

      fetchStub.returns(Promise.resolve(commentResponse))

      const payload = {
        text:      "edited",
        downvoted: true
      }
      return updateComment(comment.id, payload).then(updated => {
        assert.ok(fetchStub.calledWith(`/api/v0/comments/${comment.id}/`))
        assert.deepEqual(updated, commentResponse)
        assert.deepEqual(fetchStub.args[0][1], {
          method: PATCH,
          body:   JSON.stringify(payload)
        })
      })
    })

    it("updates a post", async () => {
      const post = makePost()

      fetchStub.returns(Promise.resolve())

      post.text = "updated!"

      await editPost(post.id, post)

      assert.ok(fetchStub.calledWith(`/api/v0/posts/${post.id}/`))
      assert.deepEqual(fetchStub.args[0][1], {
        method: PATCH,
        body:   JSON.stringify(R.dissoc("url", post))
      })
    })
  })
})
