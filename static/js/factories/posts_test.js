// @flow
import { assert } from "chai"
import R from "ramda"

import { makePost, makeChannelPostList } from "./posts"

describe("posts factories", () => {
  describe("makePost", () => {
    it("should make a text post", () => {
      let post = makePost()
      assert.isString(post.id)
      assert.isString(post.title)
      assert.isBoolean(post.upvoted)
      assert.isString(post.author_id)
      assert.isString(post.text)
      assert.isNull(post.url)
      assert.isString(post.created)
      assert.isNumber(post.num_comments)
    })

    it("should make a URL post", () => {
      let post = makePost(true)
      assert.isNull(post.text)
      assert.isString(post.url)
    })

    it("should randomly generate username", () => {
      let firstPost = makePost()
      let secondPost = makePost()
      assert.notEqual(firstPost.author_id, secondPost.author_id)
    })

    it("should randomly generate upvotes", () => {
      let upvoteScores = R.range(1, 20).map(makePost).map(R.prop("score"))
      assert.isAbove(new Set(upvoteScores).size, 1)
    })
  })

  describe("makeChannelPostList", () => {
    it("should return a list of posts", () => {
      makeChannelPostList().forEach(post => {
        assert.isString(post.id)
        assert.isString(post.title)
        assert.isNumber(post.score)
        assert.isString(post.author_id)
        assert.isString(post.channel_name)
      })
    })
  })
})
