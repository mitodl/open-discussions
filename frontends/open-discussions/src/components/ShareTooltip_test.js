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

import { ShareTooltipHelper } from "./ShareTooltip"

describe("ShareTooltip", () => {
  let execCommandStub, setSnackbarMessageStub, url, sandbox

  // unfortunately have to use mount to get the ref to work
  const renderShareTooltipHelper = (props = {}) =>
    mount(
      <ShareTooltipHelper
        url={url}
        setSnackbarMessage={setSnackbarMessageStub}
        {...props}
      />
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    execCommandStub = sandbox.stub()
    setSnackbarMessageStub = sandbox.stub()
    // $FlowFixMe: flow thinks this isn't writable (normally that's true!)
    document.execCommand = execCommandStub
    url = "http://en.wikipedia.org"
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should set a ref to the input", () => {
    const wrapper = renderShareTooltipHelper()
    assert.isTrue(wrapper.instance().input.current instanceof HTMLInputElement)
  })

  it("should populate the input field with the value of the url prop", () => {
    assert.equal(url, renderShareTooltipHelper().find("input").props().value)
  })

  it("should select text in the input field", () => {
    const wrapperInstance = renderShareTooltipHelper().instance()
    const selectStub = sandbox.stub(wrapperInstance.input.current, "select")
    const fakeEvent = { preventDefault: sandbox.stub() }
    wrapperInstance.selectAndCopyLinkText(fakeEvent)
    assert.ok(selectStub.called)
    assert.ok(fakeEvent.preventDefault.called)
    assert.ok(execCommandStub.calledWith("copy"))
    assert.ok(
      setSnackbarMessageStub.calledWith({ message: "Copied to clipboard" })
    )
  })

  it("should include the share buttons we expect", () => {
    const wrapper = renderShareTooltipHelper()
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

  it("should have a little flavor text ", () => {
    const wrapper = renderShareTooltipHelper()
    assert.equal(
      wrapper.find(".tooltip-text").text(),
      "Share a link to this post:"
    )
  })

  it("should accept an optional object type prop", () => {
    const wrapper = renderShareTooltipHelper({
      objectType: "thingamajig"
    })
    assert.equal(
      wrapper.find(".tooltip-text").text(),
      "Share a link to this thingamajig:"
    )
  })

  it("should hide buttons, if hideSocialButtons === true", () => {
    const wrapper = renderShareTooltipHelper({ hideSocialButtons: true })
    ;[FacebookShareButton, LinkedinShareButton, TwitterShareButton].forEach(
      button => assert.isNotOk(wrapper.find(button).exists())
    )
  })
})
