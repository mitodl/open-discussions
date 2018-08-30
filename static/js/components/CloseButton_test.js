// @flow
import sinon from "sinon"
import { assert } from "chai"

import CloseButton from "./CloseButton"

import { configureShallowRenderer } from "../lib/test_utils"

describe("CloseButton", () => {
  let sandbox, onClick, renderButton

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onClick = sandbox.stub()
    renderButton = configureShallowRenderer(CloseButton, { onClick })
  })

  afterEach(() => {
    sandbox.restore
  })

  it("should have the class and icon we expect", () => {
    const wrapper = renderButton()
    assert.ok(wrapper.find(".close-button").exists())
    assert.ok(wrapper.find(".material-icons.clear").exists())
  })

  it("should put onClick as onClick", () => {
    const wrapper = renderButton()
    wrapper.props().onClick()
    assert(onClick.called)
  })
})
