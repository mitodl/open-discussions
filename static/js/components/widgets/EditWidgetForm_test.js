import React from "react"
import { mount } from "enzyme/build"
import { expect } from "chai"
import sinon from "sinon"

import { apiPath } from "../../lib/widgets"

import Loader from "./Loader"
import EditWidgetForm from "./EditWidgetForm"

describe("<EditWidgetForm />", () => {
  // props for an EditWidgetForm
  const dummyWidgetListId = 2
  const dummyWidgetId = 3
  const dummyWidgetClass = "Text"
  const dummyWidgetClassConfiguration = {
    Text: [
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

  const dummyFetch = () => Promise.resolve(null)

  // General props for both types of widgetForms, edit and new
  const dummyGeneralFormProps = {
    widgetListId: dummyWidgetListId,
    fetchData:    dummyFetch,
    errorHandler: sinon.spy(),
    onSubmit:     sinon.spy(),
    Loader:       Loader
  }

  const fetchSpy = sinon.spy(dummyGeneralFormProps, "fetchData")
  const resetSpyHistory = () => {
    fetchSpy.resetHistory()
    dummyGeneralFormProps.errorHandler.resetHistory()
    dummyGeneralFormProps.onSubmit.resetHistory()
  }

  // props for an EditWidgetForm
  const dummyEditWidgetFormProps = {
    widgetId: dummyWidgetId,
    ...dummyGeneralFormProps
  }

  // state for an EditWidgetForm
  const dummyEditWidgetFormState = {
    currentWidgetData:        dummyFormData,
    widgetClassConfiguration: dummyWidgetClassConfiguration,
    widgetClass:              dummyWidgetClass
  }

  // Test default behavior
  it("returns loader if no data is loaded", () => {
    const wrap = mount(<EditWidgetForm {...dummyEditWidgetFormProps} />)

    expect(wrap.exists(".default-loader")).to.equal(true)
  })

  it("renders a WidgetForm if data is loaded and that form submits properly", () => {
    const wrap = mount(<EditWidgetForm {...dummyEditWidgetFormProps} />)
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
    expect(
      fetchSpy.withArgs(apiPath("widget", dummyWidgetId), {
        body: JSON.stringify({
          configuration: configuration,
          title:         title,
          widget_class:  dummyWidgetClass
        }),
        method: "PATCH"
      }).callCount
    ).to.equal(1)
    resetSpyHistory()
  })
})
