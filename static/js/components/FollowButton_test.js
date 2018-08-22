// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import FollowButton from "./FollowButton"
import LoginPopup from "./LoginPopup"

import { makePost } from "../factories/posts"
import { shouldIf } from "../lib/test_utils"
import * as utilFuncs from "../lib/util"
import Router from "../Router"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("FollowButton", () => {
  let helper, toggleFollowPostStub, post

  beforeEach(() => {
    //sandbox = sinon.createSandbox()
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

  it("should have a LoginPopup, if the user is anonymous", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderButton()
    wrapper.find(LoginPopup).exists()
  })

  it("should not have a LoginPopup, if the user is not anonymous", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
    assert.isNotOk(
      renderButton()
        .find(LoginPopup)
        .exists()
    )
  })

  //
  ;[[true, "Unfollow"], [false, "Follow"]].forEach(
    ([subscribed, buttonText]) => {
      it(`should include a ${buttonText} button when subscribed === ${subscribed.toString()}`, () => {
        helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
        post.subscribed = subscribed
        const wrapper = renderButton()
        const button = wrapper.find(
          subscribed ? ".subscribed" : ".unsubscribed"
        )
        assert.include(button.text(), buttonText)
        button.simulate("click")
        assert.ok(toggleFollowPostStub.calledOnce)
      })
    }
  )

  //
  ;[true, false].forEach(isAnonymous => {
    it(`clicking the follow button ${shouldIf(
      isAnonymous
    )} set visible state to true and ${shouldIf(
      !isAnonymous
    )} trigger follow function`, () => {
      helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(isAnonymous)
      post.subscribed = false
      const wrapper = renderButton()
      wrapper.find(".unsubscribed").simulate("click")
      if (isAnonymous) {
        assert.equal(wrapper.find(LoginPopup).props().visible, isAnonymous)
      }
      assert.equal(toggleFollowPostStub.notCalled, isAnonymous)
    })
  })
})
