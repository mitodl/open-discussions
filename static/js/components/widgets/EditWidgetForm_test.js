import React from "react"
import { mount } from "enzyme/build"
import { expect } from "chai"
import sinon from "sinon"

import Loader from "./Loader"
import EditWidgetForm from "./EditWidgetForm"

import IntegrationTestHelper from "../../util/integration_test_helper"

describe("<EditWidgetForm />", () => {
  const dummyWidgetListId = 2
  const dummyWidgetId = 3
  const dummyWidgetClass = "Text"
  const dummyWidgetClassConfiguration = {
    [dummyWidgetClass]: [
      {
        key:       "title",
        label:     "Title",
        inputType: "text",
        props:     {
          placeholder: "Enter widget title",
          autoFocus:   true
        }
      },
      {
        key:       "body",
        label:     "Body",
        inputType: "textarea",
        props:     {
          placeholder: "Enter widget text",
          maxLength:   "",
          minLength:   ""
        }
      }
    ]
  }
  const dummyFormData = {
    title: "dummyTitle",
    body:  "dummyBody"
  }

  const dummyEditWidgetFormState = {
    currentWidgetData:        dummyFormData,
    widgetClassConfiguration: dummyWidgetClassConfiguration,
    widgetClass:              dummyWidgetClass
  }

  let helper
  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.getWidgetStub.returns(
      Promise.resolve({
        widgetClassConfigurations: dummyWidgetClassConfiguration,
        widgetData:                {}
      })
    )
    helper.updateWidgetStub.returns(
      Promise.resolve({
        widgetClassConfigurations: dummyWidgetClassConfiguration,
        widgetData:                {}
      })
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  const render = (props = {}) =>
    mount(
      <EditWidgetForm
        widgetId={dummyWidgetId}
        widgetListId={dummyWidgetListId}
        errorHandler={helper.sandbox.spy()}
        onSubmit={helper.sandbox.spy()}
        Loader={Loader}
        {...props}
      />
    )

  it("returns loader if no data is loaded", () => {
    const wrap = render()

    expect(wrap.exists(".default-loader")).to.equal(true)
  })

  it("renders a WidgetForm if data is loaded and that form submits properly", () => {
    const wrap = render()
    wrap.setState(dummyEditWidgetFormState)
    wrap.update()

    expect(wrap.exists("WidgetForm")).to.equal(true)
    expect(wrap.find("WidgetForm").prop("formData")).to.deep.equal(
      dummyFormData
    )
    expect(wrap.find("WidgetForm").prop("widgetClass")).to.equal(
      dummyWidgetClass
    )
    expect(
      wrap.find("WidgetForm").prop("widgetClassConfigurations")
    ).to.deep.equal(dummyWidgetClassConfiguration)
    expect(wrap.find("WidgetForm").prop("widgetClasses")).to.have.lengthOf(1)
    expect(wrap.find("WidgetForm").prop("widgetClasses")[0]).to.equal(
      dummyWidgetClass
    )

    wrap.simulate("submit")
    const {
      title,
      ...configuration
    } = dummyEditWidgetFormState.currentWidgetData

    sinon.assert.calledWith(helper.updateWidgetStub, dummyWidgetId, {
      configuration: configuration,
      title:         title,
      widget_class:  dummyWidgetClass
    })
  })
})
