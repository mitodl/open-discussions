// @flow
import R from "ramda"
import React from "react"
import { shallow } from "enzyme"
import sinon from "sinon"
import casual from "casual-browserify"
import { assert } from "chai"

import WidgetField from "./WidgetField"

import { makeFieldSpec, makeWidgetListResponse } from "../../factories/widgets"
import {
  WIDGET_FIELD_TYPE_MARKDOWN,
  WIDGET_FIELD_TYPE_NUMBER,
  WIDGET_FIELD_TYPE_PEOPLE,
  WIDGET_FIELD_TYPE_TEXT,
  WIDGET_FIELD_TYPE_TEXTAREA,
  WIDGET_FIELD_TYPE_URL
} from "../../lib/constants"
import { makeProfile } from "../../factories/profiles"

describe("WidgetField", () => {
  let sandbox, value, instance, fieldSpec

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    value = casual.sentence
    const response = makeWidgetListResponse()
    instance = response.widgets[0]
    const spec = response.available_widgets.filter(
      _spec => _spec.widget_type === instance.widget_type
    )
    fieldSpec = spec[0].form_spec[0]
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getValue = lens => {
    const ret = R.view(lens, instance)
    return ret
  }

  const updateValues = (lenses, values) => {
    lenses.forEach((lens, i) => {
      instance = R.set(lens, values[i], instance)
    })
  }

  const render = (props = {}) =>
    shallow(
      <WidgetField
        fieldSpec={fieldSpec}
        getValue={getValue}
        updateValues={updateValues}
        {...props}
      />
    )
  ;[
    WIDGET_FIELD_TYPE_TEXT,
    WIDGET_FIELD_TYPE_TEXTAREA,
    WIDGET_FIELD_TYPE_NUMBER,
    WIDGET_FIELD_TYPE_URL
  ].forEach(fieldType => {
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
      })
    })
  })
  ;[
    WIDGET_FIELD_TYPE_TEXT,
    WIDGET_FIELD_TYPE_TEXTAREA,
    WIDGET_FIELD_TYPE_URL
  ].forEach(fieldType => {
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
    fieldSpec = makeFieldSpec(WIDGET_FIELD_TYPE_NUMBER)
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
    fieldSpec = makeFieldSpec(WIDGET_FIELD_TYPE_MARKDOWN)
    const value = "some *text*"
    instance.configuration[fieldSpec.field_name] = value
    const wrapper = render()

    const editor = wrapper.find("Connect(Editor)")
    assert.isTrue(editor.exists())
    assert.equal(editor.prop("initialValue"), value)
    assert.equal(editor.prop("placeHolder"), "")

    const newValue = "new text"
    editor.prop("onChange")(newValue)
    assert.equal(instance.configuration[fieldSpec.field_name], newValue)
  })

  it("renders an embedly component", () => {
    fieldSpec = makeFieldSpec(WIDGET_FIELD_TYPE_URL)
    fieldSpec.props.show_embed = true
    instance.configuration[fieldSpec.field_name] = value
    const wrapper = render()
    const embedlyCard = wrapper.find("EmbedlyCard")
    assert.isTrue(embedlyCard.exists())
    assert.equal(embedlyCard.prop("url"), value)
  })

  describe("people", () => {
    [true, false].forEach(hasJson => {
      it(`renders ${hasJson ? "with" : "without"} JSON data`, () => {
        fieldSpec = makeFieldSpec(WIDGET_FIELD_TYPE_PEOPLE)
        value = makeProfile()
        instance.configuration[fieldSpec.field_name] = value.username
        instance.json = hasJson ? { [fieldSpec.field_name]: [value] } : null
        const wrapper = render()
        const props = wrapper.find("Connect(PeopleSelector)").props()
        assert.deepEqual(
          props.profiles,
          hasJson ? instance.json[fieldSpec.field_name] : []
        )
      })
    })

    it("updates profiles", () => {
      fieldSpec = makeFieldSpec(WIDGET_FIELD_TYPE_PEOPLE)
      const wrapper = render()
      const profiles = R.range(1, 5).map(() => makeProfile())
      wrapper.find("Connect(PeopleSelector)").prop("updateProfiles")(profiles)
      assert.deepEqual(instance.json[fieldSpec.field_name], profiles)
      assert.deepEqual(
        instance.configuration[fieldSpec.field_name],
        profiles.map(profile => profile.username)
      )
    })
  })

  it("doesn't render an embedly component when show_embed is false", () => {
    fieldSpec = makeFieldSpec(WIDGET_FIELD_TYPE_URL)
    fieldSpec.props.show_embed = false
    const wrapper = render()
    const embedlyCard = wrapper.find("EmbedlyCard")
    assert.isFalse(embedlyCard.exists())
  })
})
