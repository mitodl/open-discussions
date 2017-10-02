// @flow
import { assert } from "chai"

import {
  authRequiredURL,
  channelURL,
  frontPageURL,
  newPostURL,
  postDetailURL,
  getChannelNameFromPathname
} from "./url"

describe("url helper functions", () => {
  describe("channelURL", () => {
    it("should return a good URL", () => {
      assert.equal(channelURL("foobar"), "/channel/foobar")
    })
  })

  describe("postDetailURL", () => {
    it("should return a good URL", () => {
      assert.equal(
        postDetailURL("foobar", "23434j3j3"),
        "/channel/foobar/23434j3j3"
      )
    })
  })

  describe("newPostURL", () => {
    it("should return a url for creating a new post", () => {
      assert.equal(newPostURL("channel_name"), "/create_post/channel_name")
    })

    it("should return a non-specific URL if not passed a channel name", () => {
      assert.equal(newPostURL(undefined), "/create_post/")
    })
  })

  describe("frontPageURL", () => {
    it("should return a url for the front page", () => {
      assert.equal(frontPageURL(), "/")
    })
  })

  describe("getChannelNameFromPathname", () => {
    it("should return a channel", () => {
      [
        ["/channel/foobar/", "foobar"],
        ["/channel/foobar", "foobar"],
        ["/channel/foobar/baz/", "foobar"],
        ["/channel/foobar_baz/boz", "foobar_baz"],
        ["/channel/foobarbaz9/boz", "foobarbaz9"],
        ["/channel/Foobarbaz9/boz", "Foobarbaz9"],
        ["/channel/fOObar_Baz9/boz", "fOObar_Baz9"]
      ].forEach(([url, expectation]) => {
        assert.equal(expectation, getChannelNameFromPathname(url))
      })
    })

    it("should return null otherwise", () => {
      assert.equal(null, getChannelNameFromPathname(""))
    })
  })

  describe("authRequiredURL", () => {
    it("should return a url for the auth required page", () => {
      assert.equal(authRequiredURL(), "/auth_required/")
    })
  })
})
