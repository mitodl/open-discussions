// @flow
import { assert } from "chai"

import ReplyButton from "./ReplyButton"
import LoginPopup from "./LoginPopup"
import IntegrationTestHelper from "../util/integration_test_helper"
import { configureShallowRenderer, shouldIf } from "../lib/test_utils"
import * as utilFuncs from "../lib/util"

describe("ReplyButton", () => {
  let helper, beginEditingStub, renderButton

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    beginEditingStub = helper.sandbox.stub()
    renderButton = configureShallowRenderer(ReplyButton, {
      beginEditing: beginEditingStub
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

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
  ;[true, false].forEach(isAnonymous => {
    it(`clicking the reply button ${shouldIf(
      isAnonymous
    )} set visible state to true and ${shouldIf(
      !isAnonymous
    )} trigger beginEditing function`, () => {
      helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(isAnonymous)
      const wrapper = renderButton()
      wrapper.find(".reply-button").simulate("click")
      if (isAnonymous) {
        assert.equal(wrapper.find(LoginPopup).props().visible, isAnonymous)
      }
      assert.equal(beginEditingStub.calledOnce, !isAnonymous)
    })
  })
})
