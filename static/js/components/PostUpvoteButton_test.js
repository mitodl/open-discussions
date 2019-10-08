// @flow
import { assert } from "chai"
import sinon from "sinon"

import LoginTooltip from "../components/LoginTooltip"
import PostUpvoteButton from "./PostUpvoteButton"

import { makePost } from "../factories/posts"
import { configureShallowRenderer } from "../lib/test_utils"

describe("PostUpvoteButton", () => {
  let sandbox, renderButton, upvoteStub, post

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    upvoteStub = sandbox.stub()
    post = makePost()
    renderButton = configureShallowRenderer(PostUpvoteButton, {
      toggleUpvote: upvoteStub,
      post
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should be wrapped with LoginTooltip", () => {
    assert.ok(
      renderButton()
        .find(LoginTooltip)
        .exists()
    )
  })

  it("should set upvoting in this.state while upvote is in progress", async () => {
    let resolver: Function
    const prommo = new Promise(resolve => {
      resolver = resolve
    })
    upvoteStub.returns(prommo)
    const wrapper = renderButton()
    assert.isFalse(wrapper.state().upvoting)
    wrapper.instance().onToggleUpvote()
    assert.isTrue(wrapper.state().upvoting)
    // $FlowFixMe: flow thinks this isn't a function
    await resolver()
    assert.isFalse(wrapper.state().upvoting)
  })
})
