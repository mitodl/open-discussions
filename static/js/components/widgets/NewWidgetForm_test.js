import React from "react"
import { mount } from "enzyme/build"
import { expect } from "chai"
import sinon from "sinon"

import NewWidgetForm from "./NewWidgetForm"
import Loader from "./Loader"

import IntegrationTestHelper from "../../util/integration_test_helper"

describe("<NewWidgetForm />", () => {
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

  const dummyNewWidgetFormState = {
    widgetClassConfigurations: dummyWidgetClassConfigurations,
    widgetClasses:             dummyWidgetClasses
  }

  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.getWidgetConfigurationsStub.returns(
      Promise.resolve({
        widgetClassConfigurations: dummyWidgetClassConfiguration
      })
    )
    helper.addWidgetStub.returns(
      Promise.resolve({
        widgetClassConfigurations: dummyWidgetClassConfiguration
      })
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  const render = (props = {}) =>
    mount(
      <NewWidgetForm
        listLength={dummyListLength}
        widgetListId={dummyWidgetListId}
        errorHandler={helper.sandbox.spy()}
        onSubmit={helper.sandbox.spy()}
        Loader={Loader}
        {...props}
      />
    )

  // Test default behavior
  it("returns loader if no data is loaded", () => {
    const wrap = render()

    expect(wrap.exists(".default-loader")).to.equal(true)
  })

  it("renders a blank WidgetForm if data is loaded and that form submits properly", () => {
    const wrap = render()
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
    sinon.assert.calledWith(helper.addWidgetStub, {
      configuration: configuration,
      title:         title,
      position:      dummyListLength,
      widget_list:   dummyWidgetListId,
      widget_class:  ""
    })
  })

  it("handles a null submit", () => {
    const wrap = render()
    wrap.setState(dummyNewWidgetFormState)
    wrap.update()
    wrap.simulate("submit")
    sinon.assert.calledWith(helper.addWidgetStub, {
      configuration: {},
      title:         null,
      position:      dummyListLength,
      widget_list:   dummyWidgetListId,
      widget_class:  ""
    })
  })
})
