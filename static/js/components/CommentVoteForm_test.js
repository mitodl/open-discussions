// @flow
import sinon from "sinon"
import { assert } from "chai"

import CommentVoteForm from "./CommentVoteForm"
import LoginTooltip from "./LoginTooltip"

import * as utilFuncs from "../lib/util"
import { wait } from "../lib/util"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import { configureShallowRenderer } from "../lib/test_utils"

describe("CommentVoteForm", () => {
  let sandbox,
    upvoteStub,
    downvoteStub,
    comment,
    resolveUpvote,
    resolveDownvote,
    renderForm

  beforeEach(() => {
    sandbox = sinon.createSandbox()
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

    renderForm = configureShallowRenderer(CommentVoteForm, {
      comment,
      upvote:   upvoteStub,
      downvote: downvoteStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

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
        wrapper
          .find(clickedButtonSelector)
          .find("img")
          .props().src,
        `${imgPrefix}.png`
      )
    } else {
      assert.include(
        wrapper.find(clickedButtonSelector).props().className,
        clickedVoteClass
      )
      assert.equal(
        wrapper
          .find(clickedButtonSelector)
          .find("img")
          .props().src,
        `${imgPrefix}_on.png`
      )
    }
    assert.notInclude(
      wrapper.find(otherButtonSelector).props().className,
      otherVoteClass
    )
  }

  it("should have a LoginTooltip", () => {
    const wrapper = renderForm()
    wrapper.find(LoginTooltip).exists()
  })

  it("clicking a vote button should not trigger vote function", () => {
    sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderForm()
    const voteStub = upvoteStub
    wrapper.find(".upvote-button").simulate("click")
    sinon.assert.notCalled(voteStub)
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
        wrapper.update()
        assertButtons(wrapper, isUpvote, false, false)
      })

      //
      ;[true, false].forEach(wasUpvote => {
        it(`when the previous state was ${
          wasUpvote ? "upvote" : "downvote"
        }`, () => {
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
