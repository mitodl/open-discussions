// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import ReactTooltip from "react-tooltip"

import { newPostForm, formatCommentsCount, PostVotingButtons } from "./posts"
import { makePost } from "../factories/posts"
import { votingTooltipText } from "./util"
import * as utilFuncs from "./util"

describe("Post utils", () => {
  it("should return a new post with empty values", () => {
    assert.deepEqual(newPostForm(), {
      isText: true,
      text:   "",
      url:    "",
      title:  ""
    })
  })

  it("should correctly format comments", () => {
    const post = makePost()
    ;[
      [0, "0 comments"],
      [1, "1 comment"],
      [10, "10 comments"]
    ].forEach(([num, expectation]) => {
      post.num_comments = num
      assert.equal(formatCommentsCount(post), expectation)
    })
  })

  describe("PostVotingButtons", () => {
    let sandbox

    const renderButtons = () => mount(<PostVotingButtons post={makePost()} />)

    beforeEach(() => {
      sandbox = sinon.sandbox.create()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it("should include tooltips if user is anonymous", () => {
      sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
      const tooltip = renderButtons().find(ReactTooltip)
      assert.isOk(tooltip.exists())
      assert.equal(tooltip.text(), votingTooltipText)
    })

    it("should not include tooltips if the user is not anonymous", () => {
      sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
      const tooltip = renderButtons().find(ReactTooltip)
      assert.isNotOk(tooltip.exists())
    })
  })
})
