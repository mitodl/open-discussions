// @flow
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { mount } from "enzyme"

import CourseSearchbox from "./CourseSearchbox"

import * as validationFuncs from "../lib/validation"

describe("CourseSearchbox", () => {
  let sandbox, onChangeStub, onSubmitStub

  const renderSearchbox = (props = {}) =>
    mount(
      <CourseSearchbox
        onChange={onChangeStub}
        onSubmit={onSubmitStub}
        {...props}
      />
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onChangeStub = sandbox.stub()
    onSubmitStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have an input", () => {
    const input = renderSearchbox({ value: "value!" }).find("input")
    const {
      type,
      className,
      name,
      placeholder,
      onChange,
      value
    } = input.props()
    assert.equal(type, "text")
    assert.equal(className, "search-input")
    assert.equal(name, "query")
    assert.equal(placeholder, "Search Learning Offerings")
    assert.equal(onChange, onChangeStub)
    assert.equal(value, "value!")
  })

  it("should have an onKeyDown handler on the input", () => {
    renderSearchbox()
      .find("input")
      .prop("onKeyDown")({
        key: "Enter"
      })
    sinon.assert.called(onSubmitStub)
  })

  it("should have a little icon", () => {
    renderSearchbox()
      .find(".search-icon")
      .simulate("click")
    sinon.assert.called(onSubmitStub)
  })

  it("should render a validation message", () => {
    const validationStub = sandbox.stub(validationFuncs, "validationMessage")
    renderSearchbox({ validation: "NO!!!!!" })
    sinon.assert.calledWith(validationStub, "NO!!!!!")
  })

  it("should render children if they are passed", () => {
    const wrapper = renderSearchbox({
      children: <div className="child">hey!</div>
    })
    assert.ok(wrapper.find(".child").exists())
  })
})
