// @flow
import { assert } from "chai"
import sinon from "sinon"
import { Link } from "react-router-dom"

import { LoginPopupHelper } from "./LoginPopup"

import { configureShallowRenderer } from "../lib/test_utils"

describe("LoginPopup", () => {
  let closePopupStub, visible, sandbox, renderLoginPopupHelper

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    closePopupStub = sandbox.stub()
    visible = true

    renderLoginPopupHelper = configureShallowRenderer(LoginPopupHelper, {
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
    assert.isTrue(closePopupStub.called)
  })

  it("should include login and signup buttons", () => {
    const wrapper = renderLoginPopupHelper()
    const links = wrapper.find(Link)
    assert.equal(links.at(0).prop("to"), "/login")
    assert.equal(links.at(1).prop("to"), "/signup")
  })

  it("should render null, if visible === false", () => {
    const wrapper = renderLoginPopupHelper({ visible: false })
    assert.isFalse(wrapper.find("div").exists())
  })
})
