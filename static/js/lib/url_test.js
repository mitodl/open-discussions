// @flow
import { assert } from "chai"

import {
  AUTH_REQUIRED_URL,
  channelURL,
  FRONTPAGE_URL,
  newPostURL,
  postDetailURL,
  getChannelNameFromPathname,
  commentPermalink,
  toQueryString,
  urlHostname,
  channelModerationURL
} from "./url"

describe("url helper functions", () => {
  describe("channelURL", () => {
    it("should return a good URL", () => {
      assert.equal(channelURL("foobar"), "/channel/foobar")
    })
  })

  describe("channelModerationURL", () => {
    it("should return a good URL", () => {
      assert.equal(
        channelModerationURL("foochannel"),
        "/moderation/channel/foochannel"
      )
    })
  })

  describe("postDetailURLWithSlug", () => {
    it(`should return a good post URL including slug`, () => {
      assert.equal(
        postDetailURL("foobar", "23434j3j3", "post_slug"),
        "/channel/foobar/23434j3j3/post_slug"
      )
    })
  })

  describe("postDetailURLWithoutSlug", () => {
    it(`should return a good post URL without a slug`, () => {
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
        ["/channel/fOObar_Baz9/boz", "fOObar_Baz9"],
        ["/moderation/channel/foobar", "foobar"],
        ["/moderation/channel/bippity/boppity", "bippity"]
      ].forEach(([url, expectation]) => {
        assert.equal(expectation, getChannelNameFromPathname(url))
      })
    })

    it("should return null otherwise", () => {
      assert.equal(null, getChannelNameFromPathname(""))
      assert.equal(null, getChannelNameFromPathname("/moderation/channel"))
      assert.equal(null, getChannelNameFromPathname("/moderation/channel/"))
    })
  })

  describe("commentPermalink with post slug", () => {
    it("should return a comment permalink with post slug", () => {
      assert.equal(
        "/channel/channel_name/post_id/post_slug/comment/comment_id/",
        commentPermalink("channel_name", "post_id", "post_slug", "comment_id")
      )
    })
  })

  describe("commentPermalink without post slug", () => {
    it("should return a comment permalink without post slug", () => {
      assert.equal(
        "/channel/channel_name/post_id/comment/comment_id/",
        commentPermalink("channel_name", "post_id", null, "comment_id")
      )
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

  describe("urlHostname", () => {
    it("should pull out the hostname", () => {
      [
        [
          "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String",
          "developer.mozilla.org"
        ],
        ["https://github.com/mitodl/open-discussions", "github.com"],
        [
          "https://mobile.github.com/mitodl/open-discussions",
          "mobile.github.com"
        ],
        ["https://mail.google.com/", "mail.google.com"],
        [
          "https://www.nytimes.com/2017/10/16/us/politics/trump-mcconnell-bannon.html",
          "www.nytimes.com"
        ]
      ].forEach(([url, expectation]) => {
        assert.equal(urlHostname(url), expectation)
      })
    })
  })
})
