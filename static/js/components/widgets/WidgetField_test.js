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
  ;["text", "textarea", "number", "url"].forEach(fieldType => {
    describe(`${fieldType} field`, () => {
      it("uses an empty string for a default value if there is none in the spec", () => {
        fieldSpec = makeFieldSpec(fieldType)
        fieldSpec.default = undefined
        value = undefined
        const wrapper = render()
        assert.equal(wrapper.find(".field").prop("value"), "")
      })

      it("uses the default value from the spec if the value is falsey", () => {
        fieldSpec = makeFieldSpec(fieldType)
        fieldSpec.default = "value"
        value = undefined
        const wrapper = render()
        assert.equal(wrapper.find(".field").prop("value"), fieldSpec.default)
      })

      it("has an onChange prop that updates the value", () => {
        fieldSpec = makeFieldSpec(fieldType)
        const wrapper = render()
        const newValue = "xyz"
        wrapper.find(".field").prop("onChange")({ target: { value: newValue } })
        sinon.assert.calledWith(onChangeStub, {
          target: {
            value: newValue
          }
        })
      })
    })
  })
  ;["text", "textarea", "url"].forEach(fieldType => {
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

  it("renders a number field with number options between the min and max", () => {
    fieldSpec = makeFieldSpec("number")
    const wrapper = render()

    const options = wrapper.find(".field option")
    const { min, max } = fieldSpec.props
    assert.equal(options.length, max - min + 1)
    options.forEach((option, i) => {
      assert.deepEqual(option.props(), {
        value:    i + min,
        children: i + min
      })
    })
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

  it("renders an embedly component", () => {
    fieldSpec = makeFieldSpec("url")
    const wrapper = render()
    const embedlyContainer = wrapper.find("Connect(EmbedlyContainer)")
    assert.isTrue(embedlyContainer.exists())
    assert.equal(embedlyContainer.prop("url"), value)
  })
})
