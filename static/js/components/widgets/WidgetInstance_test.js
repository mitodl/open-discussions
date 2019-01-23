// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import WidgetInstance from "./WidgetInstance"

import { makeWidgetInstance } from "../../factories/widgets"
import { shouldIf } from "../../lib/test_utils"
import { validWidgetRenderers } from "../../lib/widgets"

describe("WidgetInstance", () => {
  let widgetInstance,
    sandbox,
    deleteInstanceStub,
    startEditInstanceStub,
    setExpandedStub

  beforeEach(() => {
    widgetInstance = makeWidgetInstance()
    sandbox = sinon.createSandbox()
    deleteInstanceStub = sandbox.stub()
    startEditInstanceStub = sandbox.stub()
    setExpandedStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) =>
    mount(
      <WidgetInstance
        widgetInstance={widgetInstance}
        deleteInstance={deleteInstanceStub}
        index={3}
        editing={false}
        startEditInstance={startEditInstanceStub}
        expanded={true}
        setExpanded={setExpandedStub}
        {...props}
      />,
      {
        // for react-sortable-hoc
        context: {
          manager: {
            add:    sandbox.stub(),
            remove: sandbox.stub()
          }
        }
      }
    )
  it("renders the widget title", () => {
    const wrapper = render()
    assert.equal(wrapper.find(".title").text(), widgetInstance.title)
  })
  ;[
    ["URL", "UrlWidget"],
    ["RSS Feed", "RssWidget"],
    ["Markdown", "MarkdownWidget"]
  ].forEach(([widgetType, widgetClassName]) => {
    it(`renders a widget instance for ${widgetClassName} given widget_type=${widgetType}`, () => {
      const instance = makeWidgetInstance(widgetType)
      const wrapper = render({ widgetInstance: instance })
      assert.equal(
        wrapper.find(widgetClassName).prop("widgetInstance"),
        instance
      )
    })
  })
  ;[true, false].forEach(expanded => {
    it(`${shouldIf(expanded)} render the widget instance if it is ${
      expanded ? "" : "not "
    }expanded`, () => {
      const wrapper = render({ expanded })
      const name = validWidgetRenderers[widgetInstance.widget_type].name
      assert.equal(wrapper.find(name).exists(), expanded)
    })
  })
  ;[
    [true, true, "keyboard_arrow_up"],
    [true, false, "keyboard_arrow_down"],
    [false, true, null],
    [false, false, null]
  ].forEach(([editing, expanded, expected]) => {
    it(`${shouldIf(!!expected)} render the proper arrow for expanded=${String(
      expanded
    )} and editing=${String(editing)}`, () => {
      const wrapper = render({ expanded, editing })
      if (expected) {
        assert.equal(wrapper.find(".toggle-collapse").text(), expected)
      } else {
        assert.isFalse(wrapper.find(".toggle-collapse").exists())
      }
    })
  })

  describe("editable", () => {
    it("starts editing a widget", () => {
      const wrapper = render({ editing: true })
      wrapper.find(".edit").prop("onClick")()
      sinon.assert.calledWith(startEditInstanceStub, widgetInstance)
    })

    it("deletes a widget", () => {
      const wrapper = render({ editing: true })
      wrapper.find(".delete").prop("onClick")()
      sinon.assert.calledWith(deleteInstanceStub, widgetInstance)
    })

    it("has a drag handle", () => {
      const wrapper = render({ editing: true })
      assert.isTrue(wrapper.find(".drag-handle").exists())
    })
    ;[true, false].forEach(expanded => {
      it(expanded ? "collapses" : "expands", () => {
        const wrapper = render({ editing: true, expanded })
        wrapper.find(".toggle-collapse").prop("onClick")()
        sinon.assert.calledWith(setExpandedStub, !expanded)
      })
    })
  })
})
