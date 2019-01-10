// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"

import {
  newPostForm,
  formatCommentsCount,
  PostTitleAndHostname,
  formatPostTitle,
  mapPostListResponse,
  postFormIsContentless,
  getTextContent,
  isEditablePostType
} from "./posts"
import { makeChannelPostList, makePost } from "../factories/posts"
import { urlHostname } from "./url"
import { LINK_TYPE_ARTICLE, LINK_TYPE_LINK, LINK_TYPE_TEXT } from "./channels"

describe("Post utils", () => {
  it("should return a new post with empty values", () => {
    assert.deepEqual(newPostForm(), {
      postType:    null,
      text:        "",
      url:         "",
      title:       "",
      article:     [],
      thumbnail:   null,
      cover_image: null
    })
  })

  it("should let us check if a post form is empty of post content", () => {
    assert.isTrue(postFormIsContentless(newPostForm()))
    assert.isFalse(postFormIsContentless({ ...newPostForm(), text: "hey!" }))
    assert.isFalse(postFormIsContentless({ ...newPostForm(), url: "a url" }))
    assert.isFalse(
      postFormIsContentless({ ...newPostForm(), article: [{ boop: "doop" }] })
    )
  })

  it("should correctly format comments", () => {
    const post = makePost()
    ;[[0, "0 comments"], [1, "1 comment"], [10, "10 comments"]].forEach(
      ([num, expectation]) => {
        post.num_comments = num
        assert.equal(formatCommentsCount(post), expectation)
      }
    )
  })

  it("should include a domain and link icon for link posts", () => {
    const post = makePost(true)
    const postTitle = shallow(formatPostTitle(post))
    assert.ok(postTitle.find(".open_in_new").exists())
    assert.ok(
      postTitle
        .find(".expanded-url-hostname")
        .text()
        .startsWith(`(${urlHostname(post.url)}`)
    )
  })

  describe("postTitleAndHostname", () => {
    const renderPostTitle = post =>
      shallow(<PostTitleAndHostname post={post} />)

    it("should return just a title for a text post", () => {
      const post = makePost()
      const wrapper = renderPostTitle(post)
      assert.lengthOf(wrapper.find("span"), 1)
      assert.equal(wrapper.find(".post-title").text(), post.title)
    })

    it("should return a hostname too for a url post", () => {
      const post = makePost(true)
      const wrapper = renderPostTitle(post)
      assert.lengthOf(wrapper.find("span"), 2)
      assert.include(
        wrapper.find(".url-hostname").text(),
        urlHostname(post.url)
      )
    })
  })

  describe("mapPostListResponse", () => {
    let posts, postIds, oldPosts, oldPostIds

    beforeEach(() => {
      posts = makeChannelPostList()
      postIds = posts.map(post => post.id)
      oldPosts = makeChannelPostList()
      oldPostIds = oldPosts.map(post => post.id)
    })

    it("clears existing post ids if there is no existing pagination", () => {
      const response = {
        pagination: {
          sort: "new"
        },
        posts: posts
      }
      const data = {
        pagination: null,
        postIds:    oldPostIds
      }
      const returnValue = mapPostListResponse(response, data)
      assert.deepEqual(returnValue, {
        postIds:    postIds,
        pagination: {
          sort: "new"
        }
      })
    })

    it("clears existing post ids if the old and new paginations don't match", () => {
      const response = {
        pagination: {
          sort: "new"
        },
        posts: posts
      }
      const data = {
        pagination: {
          sort: "hot"
        },
        postIds: oldPostIds
      }
      const returnValue = mapPostListResponse(response, data)
      assert.deepEqual(returnValue, {
        postIds:    postIds,
        pagination: {
          sort: "new"
        }
      })
    })

    it("concats new posts after old posts, removing duplicates", () => {
      const response = {
        pagination: {
          sort: "hot"
        },
        posts: posts
      }
      const data = {
        pagination: {
          sort: "hot"
        },
        postIds: oldPostIds
      }
      const returnValue = mapPostListResponse(response, data)
      assert.deepEqual(returnValue, {
        postIds:    R.uniq(oldPosts.concat(posts).map(post => post.id)),
        pagination: {
          sort: "hot"
        }
      })
    })
  })

  describe("getTextContent", () => {
    it("gets a post's text content (or null if it has no text content)", () => {
      const exampleText = "magnets, how do they work?"
      let textPost = makePost()
      textPost = R.merge(textPost, {
        post_type: LINK_TYPE_TEXT,
        text:      exampleText
      })
      let articlePost = makePost()
      articlePost = R.merge(articlePost, {
        post_type:    LINK_TYPE_ARTICLE,
        article_text: exampleText
      })
      let linkPost = makePost()
      linkPost = R.merge(linkPost, {
        post_type: LINK_TYPE_LINK
      })

      assert.equal(getTextContent(textPost), exampleText)
      assert.equal(getTextContent(articlePost), exampleText)
      assert.isNull(getTextContent(linkPost))
    })
  })

  //
  ;[
    [LINK_TYPE_LINK, false],
    [LINK_TYPE_TEXT, true],
    [LINK_TYPE_ARTICLE, true]
  ].forEach(([postType, expectation]) => {
    it(`isEditablePostType should return ${String(
      expectation
    )} when ${postType}`, () => {
      assert.equal(
        isEditablePostType({ ...makePost(), post_type: postType }),
        expectation
      )
    })
  })
})
