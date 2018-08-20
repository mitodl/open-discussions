// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import {
  newPostForm,
  formatCommentsCount,
  PostVotingButtons,
  PostTitleAndHostname,
  formatPostTitle
} from "./posts"
import { makePost } from "../factories/posts"
import { urlHostname } from "./url"
import * as utilFuncs from "./util"
import LoginPopup from "../components/LoginPopup"

describe("Post utils", () => {
  it("should return a new post with empty values", () => {
    assert.deepEqual(newPostForm(), {
      postType: null,
      text:     "",
      url:      "",
      title:    ""
    })
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

  describe("PostVotingButtons", () => {
    let sandbox

    const renderButtons = () => shallow(<PostVotingButtons post={makePost()} />)

    beforeEach(() => {
      sandbox = sinon.createSandbox()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it("should include LoginPopup if user is anonymous", () => {
      sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
      const popup = renderButtons().find(LoginPopup)
      assert.isOk(popup.exists())
    })

    it("should not include LoginPopup if the user is not anonymous", () => {
      sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
      const popup = renderButtons().find(LoginPopup)
      assert.isNotOk(popup.exists())
    })
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
})
