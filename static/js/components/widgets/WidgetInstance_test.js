// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import WidgetInstance from "./WidgetInstance"
import { makeWidgetInstance } from "../../factories/widgets"

describe("WidgetInstance", () => {
  let widgetInstance, sandbox, deleteInstanceStub

  beforeEach(() => {
    widgetInstance = makeWidgetInstance()
    sandbox = sinon.createSandbox()
    deleteInstanceStub = sandbox.stub()
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
    it("deletes a widget", () => {
      const wrapper = render({ form: "form" })
      wrapper.find(".delete").prop("onClick")()
      sinon.assert.calledWith(deleteInstanceStub, widgetInstance)
    })

    it("has a drag handle", () => {
      const wrapper = render({ form: "form" })
      assert.isTrue(wrapper.find(".drag-handle").exists())
    })
  })
})
