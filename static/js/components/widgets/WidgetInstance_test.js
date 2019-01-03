// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import WidgetInstance from "./WidgetInstance"
import { makeWidgetInstance } from "../../factories/widgets"

describe("WidgetInstance", () => {
  let widgetInstance, sandbox, deleteInstanceStub, startEditInstanceStub

  beforeEach(() => {
    widgetInstance = makeWidgetInstance()
    sandbox = sinon.createSandbox()
    deleteInstanceStub = sandbox.stub()
    startEditInstanceStub = sandbox.stub()
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
        {...props}
      />,
      {
        context: {
          manager: {
            add:    sandbox.stub(),
            remove: sandbox.stub()
          }
        }
      }
    )
  ;[["missing", "DefaultWidget"], ["markdown", "MarkdownWidget"]].forEach(
    ([rendererName, widgetClassName]) => {
      it(`renders a widget instance for ${widgetClassName} given name react_renderer=${rendererName}`, () => {
        const instance = makeWidgetInstance(rendererName)
        const wrapper = render({ widgetInstance: instance })
        assert.isTrue(wrapper.find(widgetClassName).exists())
        assert.equal(
          wrapper.find(widgetClassName).prop("widgetInstance"),
          instance
        )
      })
    }
  )

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
  })
})
