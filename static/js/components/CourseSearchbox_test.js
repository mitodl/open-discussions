// @flow
import sinon from "sinon"
import { assert } from "chai"

import CourseSearchbox from "./CourseSearchbox"

import { configureShallowRenderer } from "../lib/test_utils"
import * as validationFuncs from "../lib/validation"

describe("CourseSearchbox", () => {
  let sandbox, renderSearchbox, onChangeStub, onSubmitStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onChangeStub = sandbox.stub()
    onSubmitStub = sandbox.stub()
    renderSearchbox = configureShallowRenderer(CourseSearchbox, {
      onChange: onChangeStub,
      onSubmit: onSubmitStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should say 'Search Learning Offerings'", () => {
    assert.equal(
      renderSearchbox()
        .find("label")
        .text(),
      "Search Learning Offerings"
    )
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
    assert.equal(placeholder, "Search")
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

  //
  ;[true, false].forEach(autoFocus => {
    it(`should pass down autoFocus of ${String(
      autoFocus
    )} to the input`, () => {
      const wrapper = renderSearchbox({ autoFocus })
      assert.equal(autoFocus, wrapper.find("input").prop("autoFocus"))
    })
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
})
