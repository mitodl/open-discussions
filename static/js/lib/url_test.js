// @flow
import { assert } from "chai"

import {
  AUTH_REQUIRED_URL,
  channelURL,
  FRONTPAGE_URL,
  newPostURL,
  postDetailURL,
  getChannelNameFromPathname,
  toQueryString
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

  describe("constants", () => {
    it("should have appropriate values for each constant", () => {
      assert.equal(AUTH_REQUIRED_URL, "/auth_required/")
      assert.equal(FRONTPAGE_URL, "/")
    })
  })

  describe("toQueryString", () => {
    it("should return an empty string for empty params", () => {
      assert.equal(toQueryString({}), "")
    })

    it("should return a query string with params sorted lexicographically", () => {
      assert.equal(
        toQueryString({
          def: 1,
          abc: 10
        }),
        "?abc=10&def=1"
      )
    })
  })
})
