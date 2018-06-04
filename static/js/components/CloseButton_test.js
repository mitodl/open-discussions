// @flow
import React from "react"
import { shallow } from "enzyme"
import sinon from "sinon"
import { assert } from "chai"

import CloseButton from "./CloseButton"

describe("CloseButton", () => {
  let sandbox, onClick

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onClick = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore
  })

  const renderButton = (props = {}) =>
    shallow(<CloseButton onClick={onClick} {...props} />)

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
