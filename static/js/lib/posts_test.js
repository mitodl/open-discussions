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
  isPostContainingText,
  getPlainTextContent,
  isEditablePostType,
  getThumbnailSrc
} from "./posts"
import { makeChannelPostList, makePost } from "../factories/posts"
import { urlHostname } from "./url"
import { LINK_TYPE_ARTICLE, LINK_TYPE_LINK, LINK_TYPE_TEXT } from "./channels"
import { shouldIf } from "./test_utils"

describe("Post utils", () => {
  it("should return a new post with empty values", () => {
    assert.deepEqual(newPostForm(), {
      postType:         null,
      text:             "",
      url:              "",
      title:            "",
      article_content:  [],
      thumbnail:        null,
      cover_image:      null,
      show_cover_image: true
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

  it("isPostContainingText returns true for posts that contain text", () => {
    const post = makePost()
    assert.isTrue(isPostContainingText({ ...post, post_type: LINK_TYPE_TEXT }))
    assert.isTrue(
      isPostContainingText({ ...post, post_type: LINK_TYPE_ARTICLE })
    )
    assert.isFalse(isPostContainingText({ ...post, post_type: LINK_TYPE_LINK }))
  })

  describe("getPlainTextContent", () => {
    const txt = "magnets, how do they work?"
    ;[
      [LINK_TYPE_LINK, {}, null, "link post"],
      [LINK_TYPE_ARTICLE, { plain_text: txt }, txt, "article posts"],
      [LINK_TYPE_TEXT, { plain_text: txt }, txt, "text posts"],
      [LINK_TYPE_TEXT, { text: txt }, null, "text posts w/ empty plain text"]
    ].forEach(([postType, updatedProperties, expReturnValue, desc]) => {
      it(`${shouldIf(
        !!expReturnValue
      )} return some text content for ${desc}`, () => {
        const post = {
          ...makePost(postType === LINK_TYPE_LINK),
          ...updatedProperties,
          post_type: postType
        }
        assert.equal(getPlainTextContent(post), expReturnValue)
      })
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

  describe("getThumbnailSrc", () => {
    const src = "img.jpg"
    ;[
      [LINK_TYPE_LINK, { thumbnail: src }, src, "link posts w/ thumbnail"],
      [LINK_TYPE_ARTICLE, { cover_image: src }, src, "articles w/ cover image"],
      [LINK_TYPE_LINK, { thumbnail: "" }, null, "link posts w/ no thumbnail"],
      [
        LINK_TYPE_ARTICLE,
        { cover_image: "" },
        null,
        "articles w/ no cover image"
      ],
      [LINK_TYPE_TEXT, {}, null, "text posts"]
    ].forEach(([postType, updatedProperties, expReturnValue, desc]) => {
      it(`${shouldIf(
        !!expReturnValue
      )} return an image source for ${desc}`, () => {
        const post = {
          ...makePost(postType === LINK_TYPE_LINK),
          ...updatedProperties,
          post_type: postType
        }
        assert.equal(getThumbnailSrc(post), expReturnValue)
      })
    })
  })
})
