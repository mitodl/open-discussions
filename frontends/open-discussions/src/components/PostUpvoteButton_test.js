// @flow
import { assert } from "chai"

import LoginTooltip from "../components/LoginTooltip"
import PostUpvoteButton from "./PostUpvoteButton"

import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("PostUpvoteButton", () => {
  let render, post, helper, resolveRequest

  beforeEach(() => {
    post = makePost()
    helper = new IntegrationTestHelper()
    helper.updateUpvoteStub.resetBehavior()
    helper.updateUpvoteStub.callsFake(
      () =>
        new Promise(resolve => {
          resolveRequest = post => {
            resolve(post)
          }
        })
    )
    render = helper.configureReduxQueryRenderer(PostUpvoteButton, {
      post
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should be wrapped with LoginTooltip", async () => {
    const { wrapper } = await render()
    assert.ok(wrapper.find(LoginTooltip).exists())
  })

  //
  ;[true, false].forEach(value => {
    it(`should set upvoting, and toggle when upvoted:${value.toString()}`, async () => {
      post.upvoted = value
      const { wrapper } = await render()
      assert.isNotNull(wrapper.find(".post-upvote-button").prop("onClick"))
      wrapper.find(".post-upvote-button").simulate("click")
      assert.isNull(wrapper.find(".post-upvote-button").prop("onClick"))
      assert.isOk(helper.updateUpvoteStub.calledWith(post.id, !value))
      await resolveRequest(post)
      assert.isNull(wrapper.find(".post-upvote-button").prop("onClick"))
    })
  })

  it("should show upvote count", async () => {
    post.score = 1234
    const { wrapper } = await render()
    assert.equal(wrapper.find(".votes").text(), "1234")
  })
})
