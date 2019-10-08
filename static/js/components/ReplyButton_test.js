// @flow
import { assert } from "chai"

import ReplyButton from "./ReplyButton"
import LoginTooltip from "./LoginTooltip"
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

  it("should wrap with LoginTooltip", () => {
    const wrapper = renderButton()
    wrapper.find(LoginTooltip).exists()
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
      assert.equal(beginEditingStub.calledOnce, !isAnonymous)
    })
  })
})
