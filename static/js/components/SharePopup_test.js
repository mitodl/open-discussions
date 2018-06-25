// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton
} from "react-share"
import { FacebookIcon, TwitterIcon, LinkedinIcon } from "react-share"

import { SharePopupHelper } from "./SharePopup"

describe("SharePopup", () => {
  let closePopupStub, execCommandStub, url, sandbox

  // unfortunately have to use mount to get the ref to work
  const renderSharePopupHelper = (props = {}) =>
    mount(<SharePopupHelper closePopup={closePopupStub} url={url} {...props} />)

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    closePopupStub = sandbox.stub()
    execCommandStub = sandbox.stub()
    // $FlowFixMe: flow thinks this isn't writable (normally that's true!)
    document.execCommand = execCommandStub
    url = "http://en.wikipedia.org"
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have a handleClickOutside handler", () => {
    const wrapper = renderSharePopupHelper()
    assert.isFunction(wrapper.instance().handleClickOutside)
    wrapper.instance().handleClickOutside()
    assert.ok(closePopupStub.called)
  })

  it("should set a ref to the input", () => {
    const wrapper = renderSharePopupHelper()
    assert.isTrue(wrapper.instance().input.current instanceof HTMLInputElement)
  })

  it("should populate the input field with the value of the url prop", () => {
    assert.equal(
      url,
      renderSharePopupHelper()
        .find("input")
        .props().value
    )
  })

  it("should select text in the input field", () => {
    const wrapperInstance = renderSharePopupHelper().instance()
    const selectStub = sandbox.stub(wrapperInstance.input.current, "select")
    const fakeEvent = { preventDefault: sandbox.stub() }
    wrapperInstance.selectInputText(fakeEvent)
    assert.ok(selectStub.called)
    assert.ok(fakeEvent.preventDefault.called)
    assert.ok(execCommandStub.calledWith("copy"))
  })

  it("should include the share buttons we expect", () => {
    const wrapper = renderSharePopupHelper()
    ;[
      [FacebookShareButton, FacebookIcon],
      [LinkedinShareButton, LinkedinIcon],
      [TwitterShareButton, TwitterIcon]
    ].forEach(([button, icon]) => {
      const buttonEl = wrapper.find(button)
      assert.ok(buttonEl.exists())
      assert.ok(buttonEl.find(icon).exists())
    })
  })

  it("should hide buttons, if hideSocialButtons === true", () => {
    const wrapper = renderSharePopupHelper({ hideSocialButtons: true })
    ;[FacebookShareButton, LinkedinShareButton, TwitterShareButton].forEach(
      button => assert.isNotOk(wrapper.find(button).exists())
    )
  })
})
