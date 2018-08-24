// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import { Link } from "react-router-dom"

import { LoginPopupHelper } from "./LoginPopup"

describe("LoginPopup", () => {
  let closePopupStub, message, visible, sandbox

  const renderLoginPopupHelper = (props = {}) =>
    shallow(
      <LoginPopupHelper
        closePopup={closePopupStub}
        message={message}
        visible={visible}
        {...props}
      />
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    closePopupStub = sandbox.stub()
    message = "Login to do something"
    visible = true
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have a handleClickOutside handler", () => {
    const wrapper = renderLoginPopupHelper()
    assert.isFunction(wrapper.instance().handleClickOutside)
    wrapper.instance().handleClickOutside()
    assert.ok(closePopupStub.called)
  })

  it("should include the message text", () => {
    assert.equal(
      message,
      renderLoginPopupHelper()
        .find(".popup-title")
        .text()
    )
  })

  it("should include login and signup buttons", () => {
    const wrapper = renderLoginPopupHelper()
    assert.equal(
      wrapper
        .find(Link)
        .at(0)
        .props().to,
      "/login"
    )
    assert.equal(
      wrapper
        .find(Link)
        .at(1)
        .props().to,
      "/signup"
    )
  })

  it("should render null, if visible === false", () => {
    visible = false
    const wrapper = renderLoginPopupHelper()
    assert.isNotOk(wrapper.find("div").exists())
  })
})
