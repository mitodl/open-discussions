// @flow
import React from "react"
import { shallow } from "enzyme"
import sinon from "sinon"
import casual from "casual-browserify"
import { assert } from "chai"

import WidgetField from "./WidgetField"

import { makeFieldSpec } from "../../factories/widgets"

describe("WidgetField", () => {
  let sandbox, onChangeStub, value, fieldSpec

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onChangeStub = sandbox.stub()
    value = casual.sentence
    fieldSpec = makeFieldSpec()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) => {
    return shallow(
      <WidgetField
        fieldSpec={fieldSpec}
        onChange={onChangeStub}
        value={value}
        {...props}
      />
    )
  }

  it("uses an empty string for a default value if there is none in the spec", () => {
    fieldSpec = makeFieldSpec()
    fieldSpec.props.default = undefined
    value = undefined
    const wrapper = render()
    assert.equal(wrapper.find(".field").prop("value"), "")
  })

  it("uses the default value from the spec if the value is falsey", () => {
    fieldSpec = makeFieldSpec()
    fieldSpec.props.default = "value"
    value = undefined
    const wrapper = render()
    assert.equal(wrapper.find(".field").prop("value"), fieldSpec.props.default)
  })
  ;["text", "textarea"].forEach(fieldType => {
    it(`renders a ${fieldType} input field`, () => {
      fieldSpec = makeFieldSpec(fieldType)
      const wrapper = render()

      const field = wrapper.find(".field")
      const props = field.props()
      if (fieldType === "textarea") {
        assert.equal(field.name(), "textarea")
      } else {
        assert.equal(props.type, "text")
        assert.equal(field.name(), "input")
      }
      assert.equal(props.maxLength, fieldSpec.props.max_length)
      assert.equal(props.minLength, fieldSpec.props.min_length)
      assert.equal(props.placeholder, fieldSpec.props.placeholder)
    })
  })

  it("renders a number field", () => {
    fieldSpec = makeFieldSpec("number")
    const wrapper = render()

    const props = wrapper.find(".field").props()
    assert.equal(props.type, "number")
    assert.equal(props.max, fieldSpec.props.max)
    assert.equal(props.min, fieldSpec.props.min)
  })

  it("renders a wysiwyg markdown field", () => {
    fieldSpec = makeFieldSpec("markdown_wysiwyg")
    const value = "some *text*"
    const wrapper = render({ value })

    const editor = wrapper.find("Connect(Editor)")
    assert.isTrue(editor.exists())
    assert.equal(editor.prop("initialValue"), value)
    assert.equal(editor.prop("placeHolder"), "")

    assert.equal(onChangeStub.callCount, 0)
    const newValue = "new text"
    editor.prop("onChange")(newValue)
    sinon.assert.calledWith(onChangeStub, {
      target: {
        name:  "text",
        value: newValue
      }
    })
  })
})
