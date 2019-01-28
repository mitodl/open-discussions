// @flow
import React from "react"
import R from "ramda"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import casual from "casual-browserify"

import { getWidgetKey } from "../../lib/widgets"
import {
  makeWidgetInstance,
  makeWidgetListResponse
} from "../../factories/widgets"

import WidgetList from "./WidgetList"
import WidgetInstance from "./WidgetInstance"
import { shouldIf } from "../../lib/test_utils"

describe("WidgetList", () => {
  let listResponse,
    sandbox,
    expanded,
    clearFormStub,
    submitFormStub,
    deleteInstanceStub,
    startEditInstanceStub,
    startAddInstanceStub,
    setExpandedStub

  beforeEach(() => {
    listResponse = makeWidgetListResponse()
    expanded = {}
    listResponse.widgets.forEach((instance, i) => {
      if (i % 2 === 0) {
        expanded[getWidgetKey(instance)] = casual.boolean
      }
    })

    sandbox = sinon.createSandbox()
    clearFormStub = sandbox.stub()
    submitFormStub = sandbox.stub()
    deleteInstanceStub = sandbox.stub()
    startEditInstanceStub = sandbox.stub()
    startAddInstanceStub = sandbox.stub()
    setExpandedStub = sandbox.stub()
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
        expanded={expanded}
        deleteInstance={deleteInstanceStub}
        startEditInstance={startEditInstanceStub}
        startAddInstance={startAddInstanceStub}
        setExpanded={setExpandedStub}
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
  ;[
    [true, true, true],
    [true, false, false],
    [false, true, true],
    [false, false, true]
  ].forEach(([editing, isExpanded, expected]) => {
    it(`has expanded=${String(expected)} when editing=${String(
      editing
    )} and expanded[key]=${String(isExpanded)}`, () => {
      expanded = {}
      const widgetKeys = listResponse.widgets.map(getWidgetKey)
      for (const key of widgetKeys) {
        expanded[key] = isExpanded
      }
      const wrapper = render({ editing, expanded })

      listResponse.widgets.forEach((widgetInstance, i) => {
        assert.equal(
          wrapper
            .find(WidgetInstance)
            .at(i)
            .prop("expanded"),
          expected
        )
      })
    })
  })

  it("sets the expanded value of an instance", () => {
    const wrapper = render()
    listResponse.widgets.forEach((widgetInstance, i) => {
      setExpandedStub.reset()
      wrapper
        .find(WidgetInstance)
        .at(i)
        .prop("toggleExpanded")()
      const key = getWidgetKey(widgetInstance)
      sinon.assert.calledWith(setExpandedStub, [key], !expanded[key])
    })
  })
  ;[true, false].forEach(editing => {
    it(`${shouldIf(
      editing
    )} show the manage widgets links when editing`, () => {
      const wrapper = render({ editing })
      assert.equal(wrapper.find(".manage-widgets").exists(), editing)
    })
  })

  describe("editing", () => {
    it("has a link to add new widgets", () => {
      const wrapper = render({ editing: true })
      wrapper.find(".add-widget").prop("onClick")()
      sinon.assert.calledWith(startAddInstanceStub)
    })
    ;[true, false].forEach(allExpanded => {
      it(`has a link to ${allExpanded ? "expand" : "collapse"} widgets`, () => {
        const widgetKeys = listResponse.widgets.map(getWidgetKey)
        expanded = {}
        if (allExpanded) {
          for (const key of widgetKeys) {
            expanded[key] = true
          }
        }

        const link = render({ editing: true, expanded }).find(
          ".toggle-collapse-all"
        )
        assert.equal(link.text(), allExpanded ? "Collapse all" : "Expand all")
        link.prop("onClick")()
        sinon.assert.calledWith(setExpandedStub, widgetKeys, !allExpanded)
      })
    })

    it("has a link to expand all widgets if any widgets are collapsed", () => {
      listResponse.widgets = R.range(0, 5).map(() => makeWidgetInstance())
      const widgetKeys = listResponse.widgets.map(getWidgetKey)
      expanded = {
        [widgetKeys[0]]: true,
        [widgetKeys[1]]: false
      }

      const link = render({ editing: true, expanded }).find(
        ".toggle-collapse-all"
      )
      assert.equal(link.text(), "Expand all")
      link.prop("onClick")()
      sinon.assert.calledWith(setExpandedStub, widgetKeys, true)
    })
  })
})
