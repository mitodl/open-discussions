// @flow
import { assert } from "chai"

import {
  makeWidgetInstance,
  makeWidgetListResponse,
  makeWidgetSpec
} from "./widgets"

describe("widget factories", () => {
  it("makes widget instances", () => {
    const instance = makeWidgetInstance()
    assert.isNumber(instance.id)
    assert.isString(instance.title)
    assert.isString(instance.widget_type)
    assert.isObject(instance.configuration)
  })

  it("makes a widget spec", () => {
    const spec = makeWidgetSpec()
    assert.isString(spec.widget_type)
    assert.isArray(spec.form_spec)
    const firstSpec = spec.form_spec[0]
    assert.isString(firstSpec.field_name)
    assert.isString(firstSpec.label)
    assert.isString(firstSpec.input_type)
    assert.isObject(firstSpec.props)
  })

  it("makes a widget list response", () => {
    const response = makeWidgetListResponse()
    assert.isNumber(response.id)
    assert.isArray(response.widgets)
    assert.isArray(response.available_widgets)
  })
})
