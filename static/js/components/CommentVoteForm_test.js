// @flow
import { assert } from "chai"

import CommentVoteForm from "./CommentVoteForm"
import LoginTooltip from "./LoginTooltip"
import * as LoginTooltipMod from "./LoginTooltip"

import * as utilFuncs from "../lib/util"
import { wait } from "../lib/util"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("CommentVoteForm", () => {
  let comment, resolveRequest, helper, render, anonStub

  beforeEach(async () => {
    // use promise which will never resolve
    helper = new IntegrationTestHelper()
    helper.updateCommentStub.resetBehavior()
    helper.updateCommentStub.callsFake(
      () =>
        new Promise(resolve => {
          resolveRequest = comment => {
            resolve(comment)
          }
        })
    )
    comment = makeComment(makePost())
    comment.upvoted = false
    comment.downvoted = false
    anonStub = helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)

    render = helper.configureReduxQueryRenderer(CommentVoteForm, {
      comment
    })
  })

  afterEach(async () => {
    helper.cleanup()
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

  it("should have a LoginTooltip", async () => {
    const { wrapper } = await render()
    wrapper.find(LoginTooltip).exists()
  })

  it("clicking a vote button should not trigger vote function for anons", async () => {
    anonStub.returns(true)
    // have to stub out b/c LoginTooltip overrides click handlers
    helper.stubComponent(LoginTooltipMod, "LoginTooltip")
    const { wrapper } = await render()
    assert.isNull(wrapper.find(".upvote-button").prop("onClick"))
    assert.isNull(wrapper.find(".downvote-button").prop("onClick"))
  })

  //
  ;[true, false].forEach(isUpvote => {
    describe(`clicks the ${isUpvote ? "upvote" : "downvote"} button`, () => {
      it("when the previous state was clear", async () => {
        const { wrapper } = await render()

        wrapper
          .find(isUpvote ? ".upvote-button" : ".downvote-button")
          .simulate("click")
        wrapper.update()

        assertButtons(wrapper, isUpvote, false, true)

        if (isUpvote) {
          comment.upvoted = true
        } else {
          comment.downvoted = true
        }

        resolveRequest(comment)

        await wait(10)
        wrapper.update()
        assertButtons(wrapper, isUpvote, false, false)
      })

      //
      ;[true, false].forEach(wasUpvote => {
        it(`when the previous state was ${
          wasUpvote ? "upvote" : "downvote"
        }`, async () => {
          if (wasUpvote) {
            comment.upvoted = true
          } else {
            comment.downvoted = true
          }
          const { wrapper } = await render()

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
