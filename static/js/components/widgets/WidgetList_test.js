// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import { makeWidgetListResponse } from "../../factories/widgets"

import WidgetList from "./WidgetList"
import WidgetInstance from "./WidgetInstance"

describe("WidgetList", () => {
  let listResponse, sandbox

  beforeEach(() => {
    listResponse = makeWidgetListResponse()
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) =>
    mount(<WidgetList widgetInstances={listResponse.widgets} {...props} />)

  it("renders a list of WidgetInstances", () => {
    const deleteInstance = "delete an instance"
    const wrapper = render({ editing: true, deleteInstance })
    assert.equal(
      wrapper.find(WidgetInstance).length,
      listResponse.widgets.length
    )

    listResponse.widgets.forEach((widgetInstance, i) => {
      const props = wrapper
        .find(WidgetInstance)
        .at(i)
        .props()
      assert.deepEqual(props.widgetInstance, widgetInstance)
      assert.equal(props.index, i)
      assert.isTrue(props.editing)
      assert.equal(props.deleteInstance, deleteInstance)
    })
  })
  ;[true, false].forEach(hasForm => {
    it(`${hasForm ? "has" : "doesn't have"} a form`, () => {
      const wrapper = render({ editing: hasForm })
      assert.equal(wrapper.find(".manage-widgets").length, hasForm ? 1 : 0)
    })
  })

  describe("form", () => {
    it("has a cancel button which cancels", () => {
      const clearForm = sandbox.stub()
      const wrapper = render({ editing: true, clearForm })
      wrapper.find(".cancel").prop("onClick")()
      sinon.assert.calledWith(clearForm)
    })

    it("has a done button which submits", () => {
      const submitForm = sandbox.stub()
      const wrapper = render({ editing: true, submitForm })
      wrapper.find(".submit").prop("onClick")()
      sinon.assert.calledWith(submitForm)
    })
  })
})
