// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import FollowButton from "./FollowButton"
import LoginPopup from "./LoginPopup"

import { makePost } from "../factories/posts"
import { shouldIf } from "../lib/test_utils"
import * as utilFuncs from "../lib/util"

describe("FollowButton", () => {
  let sandbox, toggleFollowPostStub, post

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    toggleFollowPostStub = sandbox.stub()
    post = makePost()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderButton = () =>
    mount(<FollowButton post={post} toggleFollowPost={toggleFollowPostStub} />)

  it("should have a LoginPopup, if the user is anonymous", () => {
    sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderButton()
    wrapper.find(LoginPopup).exists()
  })

  it("should not have a LoginPopup, if the user is not anonymous", () => {
    sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
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
        sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
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
      sandbox.stub(utilFuncs, "userIsAnonymous").returns(isAnonymous)
      post.subscribed = false
      const wrapper = renderButton()
      wrapper.find(".unsubscribed").simulate("click")
      assert.deepEqual(wrapper.state(), {
        popupVisible: isAnonymous
      })
      if (isAnonymous) {
        assert.equal(wrapper.find(LoginPopup).props().visible, isAnonymous)
      }
      assert.equal(toggleFollowPostStub.notCalled, isAnonymous)
    })
  })
})
