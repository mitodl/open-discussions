// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import FollowButton from "./FollowButton"
import LoginTooltip from "./LoginTooltip"
import Router from "../Router"

import { makePost } from "../factories/posts"
import * as utilFuncs from "../lib/util"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("FollowButton", () => {
  let helper, toggleFollowPostStub, post

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    toggleFollowPostStub = helper.sandbox.stub()
    post = makePost()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderButton = () =>
    mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <FollowButton post={post} toggleFollowPost={toggleFollowPostStub} />
      </Router>
    )

  it("should have a LoginTooltip", () => {
    const wrapper = renderButton()
    wrapper.find(LoginTooltip).exists()
  })

  //
  ;[
    [true, "Unfollow"],
    [false, "Follow"]
  ].forEach(([subscribed, buttonText]) => {
    it(`should include a ${buttonText} button when subscribed === ${subscribed.toString()}`, () => {
      helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
      post.subscribed = subscribed
      const wrapper = renderButton()
      const button = wrapper.find(subscribed ? ".subscribed" : ".unsubscribed")
      assert.include(button.text(), buttonText)
      button.simulate("click")
      assert.ok(toggleFollowPostStub.calledOnce)
    })
  })
})
