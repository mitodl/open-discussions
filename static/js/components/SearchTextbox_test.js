// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import SearchTextbox from "./SearchTextbox"

describe("SearchTextbox", () => {
  let sandbox, onChangeStub, onSubmitStub, onClearStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onChangeStub = sandbox.stub()
    onSubmitStub = sandbox.stub()
    onClearStub = sandbox.stub()
  })

  const render = (props = {}) =>
    // mount is necessary to check focus
    mount(
      <SearchTextbox
        onChange={onChangeStub}
        onSubmit={onSubmitStub}
        onClear={onClearStub}
        value={""}
        {...props}
      />
    )

  it("focuses on the input element, passes onChange events and the value prop to it", () => {
    const value = "hello"
    const wrapper = render({ value })
    assert.equal(wrapper.find("input").prop("value"), value)
    assert.equal(document.activeElement.value, value)
    const event = { target: { value: "new value" } }
    wrapper.find("input").prop("onChange")(event)
    sinon.assert.calledWith(onChangeStub, event)
  })

  it("triggers onClear when the 'x' is clicked, retains focus on input element", () => {
    const wrapper = render({ value: "text" })
    const event = { target: { value: "click" } }
    wrapper.find(".clear-icon").prop("onClick")(event)
    sinon.assert.calledWith(onClearStub, event)
    assert.equal(document.activeElement.type, "text")
  })

  it("triggers onSubmit when the spyglass is clicked", () => {
    const wrapper = render()
    const event = { target: { value: "click" } }
    wrapper.find(".search-icon").prop("onClick")(event)
    sinon.assert.calledWith(onSubmitStub, event)
  })
  ;[true, false].forEach(hasText => {
    it(`if there ${hasText ? "is text" : "isn't text"} then there should ${
      hasText ? "" : "not "
    }be a clear button`, () => {
      const wrapper = render({ value: hasText ? "text" : "" })
      assert.equal(wrapper.find(".clear-icon").length, hasText ? 1 : 0)
    })
  })

  it("triggers onSubmit when the enter key is pressed", () => {
    const wrapper = render()
    const event = { key: "Enter" }
    wrapper.find("input").prop("onKeyDown")(event)
    sinon.assert.calledWith(onSubmitStub, event)
  })
})
