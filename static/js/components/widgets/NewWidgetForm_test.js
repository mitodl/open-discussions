import React from "react"
import { mount } from "enzyme/build"
import { expect } from "chai"
import sinon from "sinon"

import { apiPath } from "../../lib/widgets"

import NewWidgetForm from "./NewWidgetForm"
import Loader from "./Loader"

describe("<NewWidgetForm />", () => {
  // props for a NewWidgetForm
  const dummyWidgetListId = 2
  const dummyListLength = 4
  const dummyWidgetClasses = ["Text", "Url"]
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
  const dummyWidgetClassConfigurations = {
    ...dummyWidgetClassConfiguration,
    Url: [
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
        key:       "url",
        label:     "URL",
        inputType: "text",
        props:     {
          placeholder: "Enter url",
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

  // props for a NewWidgetForm
  const dummyNewWidgetFormProps = {
    listLength: dummyListLength,
    ...dummyGeneralFormProps
  }

  const dummyNewWidgetFormState = {
    widgetClassConfigurations: dummyWidgetClassConfigurations,
    widgetClasses:             dummyWidgetClasses
  }

  // Test default behavior
  it("returns loader if no data is loaded", () => {
    const wrap = mount(<NewWidgetForm {...dummyNewWidgetFormProps} />)

    expect(wrap.exists(".default-loader")).to.equal(true)
  })

  it("renders a blank WidgetForm if data is loaded and that form submits properly", () => {
    const wrap = mount(<NewWidgetForm {...dummyNewWidgetFormProps} />)
    wrap.setState(dummyNewWidgetFormState)
    wrap.update()

    expect(wrap.exists("WidgetForm")).to.equal(true)
    expect(wrap.find("WidgetForm").prop("formData")).to.deep.equal({
      title: null
    })
    expect(wrap.find("WidgetForm").prop("widgetClass")).to.equal("")
    expect(
      wrap.find("WidgetForm").prop("widgetClassConfigurations")
    ).to.deep.equal(dummyWidgetClassConfigurations)
    expect(wrap.find("WidgetForm").prop("widgetClasses")).to.equal(
      dummyWidgetClasses
    )

    wrap.find("WidgetForm").setState({ formData: dummyFormData })
    wrap.simulate("submit")
    const { title, ...configuration } = dummyFormData
    expect(
      fetchSpy.withArgs(apiPath("widget"), {
        body: JSON.stringify({
          configuration: configuration,
          title:         title,
          position:      dummyListLength,
          widget_list:   dummyWidgetListId,
          widget_class:  ""
        }),
        method: "POST"
      }).callCount
    ).to.equal(1)
    resetSpyHistory()
  })

  it("handles a null submit", () => {
    const wrap = mount(<NewWidgetForm {...dummyNewWidgetFormProps} />)
    wrap.setState(dummyNewWidgetFormState)
    wrap.update()
    wrap.simulate("submit")
    expect(
      fetchSpy.withArgs(apiPath("widget"), {
        body: JSON.stringify({
          configuration: {},
          title:         null,
          position:      dummyListLength,
          widget_list:   dummyWidgetListId,
          widget_class:  ""
        }),
        method: "POST"
      }).callCount
    ).to.equal(1)
    resetSpyHistory()
  })
})
