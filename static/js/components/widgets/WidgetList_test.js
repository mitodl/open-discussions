// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import { makeWidgetListResponse } from "../../factories/widgets"

import WidgetList from "./WidgetList"
import WidgetInstance from "./WidgetInstance"

describe("WidgetList", () => {
  let listResponse,
    sandbox,
    clearFormStub,
    submitFormStub,
    deleteInstanceStub,
    startEditInstanceStub,
    startAddInstanceStub

  beforeEach(() => {
    listResponse = makeWidgetListResponse()
    sandbox = sinon.createSandbox()
    clearFormStub = sandbox.stub()
    submitFormStub = sandbox.stub()
    deleteInstanceStub = sandbox.stub()
    startEditInstanceStub = sandbox.stub()
    startAddInstanceStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) =>
    mount(
      <WidgetList
        widgetInstances={listResponse.widgets}
        clearForm={clearFormStub}
        submitForm={submitFormStub}
        editing={false}
        deleteInstance={deleteInstanceStub}
        startEditInstance={startEditInstanceStub}
        startAddInstance={startAddInstanceStub}
        {...props}
      />
    )

  it("renders a list of WidgetInstances", () => {
    const wrapper = render({ editing: true })
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
      assert.equal(props.deleteInstance, deleteInstanceStub)
      assert.equal(props.startEditInstance, startEditInstanceStub)
    })
  })
  ;[true, false].forEach(hasForm => {
    it(`${hasForm ? "has" : "doesn't have"} a form`, () => {
      const wrapper = render({ editing: hasForm })
      assert.equal(wrapper.find(".manage-widgets").length, hasForm ? 1 : 0)
    })
  })

  describe("form", () => {
    it("has a link to add new widgets", () => {
      const wrapper = render({ editing: true })
      wrapper.find(".add-widget").prop("onClick")()
      sinon.assert.calledWith(startAddInstanceStub)
    })
  })
})
