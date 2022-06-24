// @flow
/* global SETTINGS:false */
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
  let comment, resolveRequest, rejectRequest, helper, render, anonStub

  beforeEach(async () => {
    // use promise which will never resolve
    helper = new IntegrationTestHelper()
    helper.updateCommentStub.resetBehavior()
    helper.updateCommentStub.callsFake(
      () =>
        new Promise((resolve, reject) => {
          resolveRequest = comment => {
            resolve(comment)
          }
          rejectRequest = () => {
            reject()
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
      it("gracefully handles a failed request", async () => {
        const { wrapper, store } = await render()
        wrapper
          .find(isUpvote ? ".upvote-button" : ".downvote-button")
          .simulate("click")
        await rejectRequest()
        await wait(1)
        assert.deepEqual(
          store.getState().ui.banner.message,
          `Something went wrong ${
            isUpvote ? "upvoting" : "downvoting"
          } this comment. Contact us at ${SETTINGS.support_email}`
        )
      })

      it("when the previous state was clear", async () => {
        const { wrapper } = await render()

        wrapper
          .find(isUpvote ? ".upvote-button" : ".downvote-button")
          .simulate("click")
        wrapper.update()

        assertButtons(wrapper, isUpvote, false, true)

        // should pre-emptively adjust the score so user's action looks instant
        assert.equal(
          wrapper.find(".score").text(),
          isUpvote ? `${comment.score + 1}` : `${comment.score - 1}`
        )

        if (isUpvote) {
          comment.upvoted = true
        } else {
          comment.downvoted = true
        }

        resolveRequest(comment)
        await wait(1)
        wrapper.update()
        assertButtons(wrapper, isUpvote, false, false)
      })

      it("should not optimistically update score when its the users own comment", async () => {
        SETTINGS.username = comment.author_id
        const { wrapper } = await render()
        wrapper
          .find(isUpvote ? ".upvote-button" : ".downvote-button")
          .simulate("click")
        wrapper.update()
        assert.equal(wrapper.find(".score").text(), comment.score)
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

          // expectedScore[isUpvote][wasUpvote]
          const expectedScore = {
            true: {
              true:  comment.score - 1,
              false: comment.score + 2
            },
            false: {
              true:  comment.score - 2,
              false: comment.score + 1
            }
          }

          // should pre-emptively adjust the score so user's action looks instant
          assert.equal(
            wrapper.find(".score").text(),
            // $FlowFixMe: it's a test, leave me alone
            expectedScore[isUpvote][wasUpvote].toString()
          )

          assertButtons(wrapper, isUpvote, wasUpvote === isUpvote, true)
        })
      })
    })
  })
})
