// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"
import ReactTooltip from "react-tooltip"

import { wait, votingTooltipText } from "../lib/util"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import CommentVoteForm from "./CommentVoteForm"

import * as utilFuncs from "../lib/util"

describe("CommentVoteForm", () => {
  let sandbox, upvoteStub, downvoteStub, comment, resolveUpvote, resolveDownvote

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    // use promise which will never resolve
    upvoteStub = sandbox.stub().returns(
      new Promise(resolve => {
        resolveUpvote = resolve
      })
    )
    downvoteStub = sandbox.stub().returns(
      new Promise(resolve => {
        resolveDownvote = resolve
      })
    )
    comment = makeComment(makePost())
    comment.upvoted = false
    comment.downvoted = false
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderForm = (props = {}) =>
    mount(
      <CommentVoteForm
        comment={comment}
        upvote={upvoteStub}
        downvote={downvoteStub}
        {...props}
      />
    )

  const assertButtons = (wrapper, isUpvote, isClear, isVoting) => {
    const clickedButtonSelector = isUpvote
      ? ".upvote-button"
      : ".downvote-button"
    const clickedVoteClass = isUpvote ? "upvoted" : "downvoted"
    const otherButtonSelector = isUpvote ? ".downvote-button" : ".upvote-button"
    const otherVoteClass = isUpvote ? "downvoted" : "upvoted"
    const imgPrefix = isUpvote
      ? "/static/images/upvote_arrow"
      : "/static/images/downvote_arrow"

    assert.equal(wrapper.find(clickedButtonSelector).props().disabled, isVoting)
    assert.equal(wrapper.find(otherButtonSelector).props().disabled, isVoting)
    if (isClear) {
      assert.notInclude(
        wrapper.find(clickedButtonSelector).props().className,
        clickedVoteClass
      )
      assert.equal(
        wrapper.find(clickedButtonSelector).find("img").props().src,
        `${imgPrefix}.png`
      )
    } else {
      assert.include(
        wrapper.find(clickedButtonSelector).props().className,
        clickedVoteClass
      )
      assert.equal(
        wrapper.find(clickedButtonSelector).find("img").props().src,
        `${imgPrefix}_on.png`
      )
    }
    assert.notInclude(
      wrapper.find(otherButtonSelector).props().className,
      otherVoteClass
    )
  }

  it("should have tooltips, if the user is anonymous", () => {
    sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderForm()
    wrapper.find(ReactTooltip).forEach(tooltip => {
      assert.equal(tooltip.text(), votingTooltipText)
    })
  })

  it("should not have any tooltips, if the user is not anonymous", () => {
    sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
    assert.isNotOk(renderForm().find(ReactTooltip).exists())
  })

  //
  ;[true, false].forEach(isUpvote => {
    describe(`clicks the ${isUpvote ? "upvote" : "downvote"} button`, () => {
      it("when the previous state was clear", async () => {
        const wrapper = renderForm()
        const voteStub = isUpvote ? upvoteStub : downvoteStub

        wrapper
          .find(isUpvote ? ".upvote-button" : ".downvote-button")
          .simulate("click")
        sinon.assert.calledWith(voteStub, comment)
        assert.deepEqual(wrapper.state(), {
          downvoting: !isUpvote,
          upvoting:   isUpvote
        })
        assertButtons(wrapper, isUpvote, false, true)

        if (isUpvote) {
          resolveUpvote()
          comment.upvoted = true
        } else {
          resolveDownvote()
          comment.downvoted = true
        }

        wrapper.setProps({ comment })
        // wait for event loop to handle resolved promise
        await wait(10)
        assertButtons(wrapper, isUpvote, false, false)
      })

      //
      ;[true, false].forEach(wasUpvote => {
        it(`when the previous state was ${wasUpvote
          ? "upvote"
          : "downvote"}`, () => {
          if (wasUpvote) {
            comment.upvoted = true
          } else {
            comment.downvoted = true
          }
          const wrapper = renderForm()

          assertButtons(wrapper, wasUpvote, false, false)

          wrapper
            .find(isUpvote ? ".upvote-button" : ".downvote-button")
            .simulate("click")

          assertButtons(wrapper, isUpvote, wasUpvote === isUpvote, true)
        })
      })
    })
  })
})
