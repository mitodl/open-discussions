// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import { mount } from "enzyme/build/index"
import React from "react"

import LocationPicker from "./LocationPicker"

describe("LocationPicker", () => {
  let onChangeStub, onClearStub, initialLocation, placeholder, sandbox

  const renderLocationPicker = (props = {}) =>
    mount(
      <LocationPicker
        onChange={onChangeStub}
        onClear={onClearStub}
        initialLocation={initialLocation}
        placeholder={placeholder}
        {...props}
      />
    )

  beforeEach(() => {
    SETTINGS.algolia_appId = "fake"
    SETTINGS.algolia_apiKey = "fake"
    sandbox = sinon.createSandbox()
    onChangeStub = sandbox.stub()
    onClearStub = sandbox.stub()
    initialLocation = "Boulder, Colorado"
    placeholder = "Enter your city"
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have an onChange handler", () => {
    const wrapper = renderLocationPicker()
    assert.isFunction(wrapper.props().onChange)
    wrapper.props().onChange()
    assert.isTrue(onChangeStub.called)
  })

  it("should have an onClear handler", () => {
    const wrapper = renderLocationPicker()
    assert.isFunction(wrapper.props().onClear)
    wrapper.props().onClear()
    assert.isTrue(onClearStub.called)
  })

  it("should use the initialLocation and placeholder props", () => {
    const wrapper = renderLocationPicker()
    const input = wrapper.find("input")
    assert.equal(input.props().defaultValue, initialLocation)
    assert.equal(input.props().placeholder, placeholder)
  })

  it("input onChange event should call onChange prop function via updateJSON", () => {
    const wrapper = renderLocationPicker()
    wrapper
      .find("input")
      .simulate("change", { target: { name: "location", value: "Paris" } })
    sinon.assert.calledWith(onChangeStub, { suggestion: { value: "Paris" } })
  })
})
