// @flow
import { assert } from "chai"
import sinon from "sinon"
import { Link } from "react-router-dom"

import { LoginPopupHelper } from "./LoginPopup"

import { configureShallowRenderer } from "../lib/test_utils"

describe("LoginPopup", () => {
  let closePopupStub, message, visible, sandbox, renderLoginPopupHelper

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    closePopupStub = sandbox.stub()
    message = "Login to do something"
    visible = true

    renderLoginPopupHelper = configureShallowRenderer(LoginPopupHelper, {
      message,
      visible,
      closePopup: closePopupStub
    })
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
    const wrapper = renderLoginPopupHelper({ visible: false })
    assert.isNotOk(wrapper.find("div").exists())
  })
})
