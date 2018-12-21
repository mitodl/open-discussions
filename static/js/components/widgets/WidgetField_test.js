// @flow
import React from "react"
import { shallow } from "enzyme"
import sinon from "sinon"
import { makeFieldSpec } from "../../factories/widgets"
import casual from "casual-browserify"
import { assert } from "chai"
import WidgetField from "./WidgetField"

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
})
