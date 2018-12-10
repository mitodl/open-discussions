import React from "react"
import { expect } from "chai"
import sinon from "sinon"
import { mount } from "enzyme"

import WidgetList from "./WidgetList"
import { mockTextWidget } from "../../factories/widgets"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("<WidgetList />", () => {
  const dummyWidgetListId = 2
  const dummyWidgetId = 3
  const dummyPosition = 10
  const dummyWidgetInstances = [mockTextWidget(dummyWidgetId)]
  const dummyFormProps = { formProp: "dummy-form-prop" }
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
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.getWidgetListStub.returns(Promise.resolve(dummyWidgetInstances))
    helper.getWidgetConfigurationsStub.returns(
      Promise.resolve({
        widgetClassConfigurations: dummyWidgetClassConfiguration
      })
    )
    helper.getWidgetStub.returns(
      Promise.resolve({
        widgetClassConfigurations: dummyWidgetClassConfiguration,
        widgetData:                {}
      })
    )
    helper.updateWidgetStub.returns(Promise.resolve(dummyWidgetInstances))
    helper.deleteWidgetStub.returns(Promise.resolve(dummyWidgetInstances))
  })

  afterEach(() => {
    helper.cleanup()
  })

  const render = (props = {}) =>
    mount(
      <WidgetList
        widgetListId={dummyWidgetListId}
        listWrapperProps={{ listWrapperProp: "dummy-list-wrapper-prop" }}
        formWrapperProps={{ formWrapperProp: "dummy-form-wrapper-prop" }}
        widgetWrapperProps={{ widgetWrapperProp: "dummy-widget-wrapper-prop" }}
        {...props}
      />
    )

  // Default behavior tests
  it("returns null if disableWidgetFramework is true", () => {
    const wrap = render({
      disableWidgetFramework: true
    })
    const instance = wrap.instance()

    expect(instance.render()).to.equal(null)
  })

  it("returns loader if no widget instance is loaded", () => {
    const wrap = render()

    expect(wrap.exists(".default-loader")).to.equal(true)
  })

  it("runs renderWidgetList is widgetInstances are loaded", () => {
    const wrap = render()
    const instance = wrap.instance()
    const renderWidgetListSpy = sinon.spy(instance, "renderWidgetList")
    instance.updateWidgetList(dummyWidgetInstances)
    wrap.update()

    expect(wrap.exists(".widget-list")).to.equal(true)
    expect(renderWidgetListSpy.callCount).to.equal(1)
  })

  // Method Tests
  it("componentDidMount calls loadData", () => {
    const wrap = render()
    const instance = wrap.instance()
    const loadDataSpy = sinon.spy(instance, "loadData")
    instance.componentDidMount()

    expect(loadDataSpy.callCount).to.equal(1)
  })

  it("componentDidMount calls loadData only when the widgetListId changes on props", () => {
    const wrap = render()
    const instance = wrap.instance()
    const loadDataSpy = sinon.spy(instance, "loadData")
    const oldProps = wrap.props()
    instance.componentDidUpdate(oldProps)

    expect(loadDataSpy.callCount).to.equal(0)
    const adjustedProps = {
      ...oldProps,
      widgetListId: oldProps.widgetListId - 1
    }
    instance.componentDidUpdate(adjustedProps)
    expect(loadDataSpy.callCount).to.equal(1)
  })

  it("loadData calls fetch with widget list id", async () => {
    const wrap = render()
    const instance = wrap.instance()
    const updateWidgetListSpy = sinon.spy(instance, "updateWidgetList")

    // wait for componentDidMount promise to resolve
    await instance.loadData()
    sinon.assert.calledWith(helper.getWidgetListStub, dummyWidgetListId)
    expect(
      updateWidgetListSpy.withArgs(dummyWidgetInstances).callCount
    ).to.equal(2) // TODO: remove this when refactoring for redux
  })

  it("updateWidgetList sets the state", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    expect(wrap.state("widgetInstances")).to.equal(dummyWidgetInstances)
  })

  it("deleteWidget calls fetch with the widgetId and a DELETE request", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.deleteWidget(dummyWidgetId)

    sinon.assert.calledWith(helper.deleteWidgetStub, dummyWidgetId)
  })

  it("moveWidget calls fetch with the widgetId and a PATCH request", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.moveWidget(dummyWidgetId, dummyPosition)

    sinon.assert.calledWith(helper.updateWidgetStub, dummyWidgetId, {
      position: dummyPosition
    })
  })

  it("makePassThroughProps constructs an appropriate set of passThroughProps", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const deleteWidgetSpy = sinon.spy(instance, "deleteWidget")
    const moveWidgetSpy = sinon.spy(instance, "moveWidget")
    const renderListSpy = sinon.spy(instance, "renderListBody")
    const renderWidgetSpy = sinon.spy(instance, "renderWidgetBody")
    const renderEditWidgetFormSpy = sinon.spy(instance, "renderEditWidgetForm")
    const renderNewWidgetFormSpy = sinon.spy(instance, "renderNewWidgetForm")
    const updateWidgetListSpy = sinon.spy(instance, "updateWidgetList")

    const passThroughProps = instance.makePassThroughProps()

    expect(passThroughProps.widgetListId).to.equal(dummyWidgetListId)
    expect(passThroughProps.listLength).to.equal(dummyWidgetInstances.length)

    passThroughProps.deleteWidget(dummyWidgetId)
    expect(deleteWidgetSpy.withArgs(dummyWidgetId).callCount).to.equal(1)

    passThroughProps.moveWidget(dummyWidgetId, dummyPosition)
    expect(
      moveWidgetSpy.withArgs(dummyWidgetId, dummyPosition).callCount
    ).to.equal(1)

    passThroughProps.renderList()
    expect(renderListSpy.callCount).to.equal(1)

    passThroughProps.renderWidget(dummyWidgetId)
    expect(renderWidgetSpy.withArgs(dummyWidgetId).callCount).to.equal(1)

    passThroughProps.renderEditWidgetForm(dummyWidgetId)
    expect(renderEditWidgetFormSpy.withArgs(dummyWidgetId).callCount).to.equal(
      1
    )

    passThroughProps.renderNewWidgetForm()
    expect(renderNewWidgetFormSpy.callCount).to.equal(1)

    passThroughProps.updateWidgetList(dummyWidgetInstances)
    expect(
      updateWidgetListSpy.withArgs(dummyWidgetInstances).callCount
    ).to.equal(1)
  })

  it("makePassThroughProps constructs takes a widgetId and propagates it to the props", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const deleteWidgetSpy = sinon.spy(instance, "deleteWidget")
    const moveWidgetSpy = sinon.spy(instance, "moveWidget")
    const renderWidgetSpy = sinon.spy(instance, "renderWidgetBody")
    const renderEditWidgetFormSpy = sinon.spy(instance, "renderEditWidgetForm")

    const passThroughProps = instance.makePassThroughProps(
      dummyWidgetInstances[0]
    )

    passThroughProps.deleteWidget()
    expect(deleteWidgetSpy.withArgs(dummyWidgetId).callCount).to.equal(1)

    passThroughProps.moveWidget(dummyPosition)
    expect(
      moveWidgetSpy.withArgs(dummyWidgetId, dummyPosition).callCount
    ).to.equal(1)

    passThroughProps.renderWidget()
    expect(
      renderWidgetSpy.withArgs(dummyWidgetInstances[0]).callCount
    ).to.equal(1)

    passThroughProps.renderEditWidgetForm()
    expect(renderEditWidgetFormSpy.withArgs(dummyWidgetId).callCount).to.equal(
      1
    )
  })

  it("makeFormProps constructs an appropriate set of formProps", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const updateWidgetListSpy = sinon.spy(instance, "updateWidgetList")
    const formProps = instance.makeFormProps()

    expect(formProps.widgetListId).to.equal(dummyWidgetListId)
    expect(formProps.listLength).to.equal(dummyWidgetInstances.length)

    formProps.onSubmit(dummyWidgetInstances)
    expect(
      updateWidgetListSpy.withArgs(dummyWidgetInstances).callCount
    ).to.equal(1)

    const { Loader } = formProps
    const loader = mount(<Loader />)
    expect(loader.exists(".default-loader")).to.equal(true)
  })

  it("renderWidgetList renders a ListWrapper", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const listWrap = mount(instance.renderWidgetList())
    expect(listWrap.exists(".default-list-wrapper")).to.equal(true)
    expect(listWrap.props()).to.include(instance.makePassThroughProps())
    expect(listWrap.props()).to.include(wrap.props().listWrapperProps)
  })

  it("renderListBody runs render widget once for each widget in widget instances", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const renderWidgetSpy = sinon.spy(instance, "renderWidget")
    instance.renderListBody(wrap.props().listWrapperProps)

    expect(renderWidgetSpy.callCount).to.equal(dummyWidgetInstances.length)
    dummyWidgetInstances.map(instance => {
      expect(
        renderWidgetSpy.withArgs(instance, wrap.props().listWrapperProps)
          .callCount
      ).to.equal(1)
    })
  })

  it("renderWidget renders a WidgetWrapper", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const dummyWidgetInstance = dummyWidgetInstances[0]
    const dummyWidgetId = dummyWidgetInstance.id

    const widgetWrap = mount(
      instance.renderWidget(dummyWidgetInstance, wrap.props().listWrapperProps)
    )
    expect(widgetWrap.exists(`#widget-${dummyWidgetId}`)).to.equal(true)
    expect(widgetWrap.props()).to.include(dummyWidgetInstance)
    const {
      deleteWidget, // eslint-disable-line no-unused-vars
      moveWidget, // eslint-disable-line no-unused-vars
      renderEditWidgetForm, // eslint-disable-line no-unused-vars
      renderWidget, // eslint-disable-line no-unused-vars
      ...simplePassThroughProps
    } = instance.makePassThroughProps()
    expect(widgetWrap.props()).to.include(simplePassThroughProps)
    expect(widgetWrap.props()).to.have.property("deleteWidget")
    expect(widgetWrap.props()).to.have.property("moveWidget")
    expect(widgetWrap.props()).to.have.property("renderEditWidgetForm")
    expect(widgetWrap.props()).to.have.property("renderWidget")

    expect(widgetWrap.props()).to.include(wrap.props().widgetWrapperProps)
    expect(widgetWrap.props()).to.include(wrap.props().listWrapperProps)
  })

  it("renderWidgetBody renders a renderer", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const dummyWidgetInstance = dummyWidgetInstances[0]

    const renderWrap = mount(instance.renderWidgetBody(dummyWidgetInstance))
    expect(renderWrap.exists(".widget-body")).to.equal(true)
    expect(renderWrap.props()).to.include(dummyWidgetInstance)
    expect(renderWrap.props()).to.include(dummyWidgetInstance.configuration)
  })

  it("renderEditWidgetForm renders a FormWrapper", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const renderEditWidgetFormSpy = sinon.spy(
      instance,
      "renderEditWidgetFormBody"
    )

    const formWrap = mount(
      instance.renderEditWidgetForm(
        dummyWidgetId,
        wrap.props().listWrapperProps
      )
    )
    expect(formWrap.exists(".default-form-wrapper")).to.equal(true)
    expect(formWrap.props()).to.include(wrap.props().listWrapperProps)
    expect(formWrap.props()).to.include(wrap.props().formWrapperProps)
    const {
      deleteWidget, // eslint-disable-line no-unused-vars
      moveWidget, // eslint-disable-line no-unused-vars
      renderEditWidgetForm, // eslint-disable-line no-unused-vars
      renderWidget, // eslint-disable-line no-unused-vars
      ...simplePassThroughProps
    } = instance.makePassThroughProps()
    expect(formWrap.props()).to.include(simplePassThroughProps)
    expect(formWrap.props()).to.have.property("deleteWidget")
    expect(formWrap.props()).to.have.property("moveWidget")
    expect(formWrap.props()).to.have.property("renderEditWidgetForm")
    expect(formWrap.props()).to.have.property("renderWidget")

    formWrap.prop("renderForm")(dummyFormProps)
    expect(
      renderEditWidgetFormSpy.withArgs(dummyWidgetId, dummyFormProps).callCount
    ).to.equal(1)
  })

  it("renderEditWidgetFormBody renders an EditWidgetForm", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const formWrap = mount(
      instance.renderEditWidgetFormBody(
        dummyWidgetId,
        wrap.props().formWrapperProps
      )
    )
    expect(formWrap.exists("EditWidgetForm")).to.equal(true)
    expect(formWrap.find("EditWidgetForm").props()).to.include(
      wrap.props().formWrapperProps
    )
    expect(formWrap.find("EditWidgetForm").props()).to.include(
      instance.makeFormProps()
    )
    expect(formWrap.find("EditWidgetForm").prop("widgetId")).to.equal(
      dummyWidgetId
    )
  })

  it("renderNewWidgetForm renders a FormWrapper", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const renderNewWidgetFormSpy = sinon.spy(
      instance,
      "renderNewWidgetFormBody"
    )

    const formWrap = mount(
      instance.renderNewWidgetForm(wrap.props().listWrapperProps)
    )
    expect(formWrap.exists(".default-form-wrapper")).to.equal(true)
    expect(formWrap.props()).to.include(wrap.props().listWrapperProps)
    expect(formWrap.props()).to.include(wrap.props().formWrapperProps)
    expect(formWrap.props()).to.include(instance.makePassThroughProps())
    formWrap.prop("renderForm")(dummyFormProps)
    expect(renderNewWidgetFormSpy.withArgs(dummyFormProps).callCount).to.equal(
      1
    )
  })

  it("renderNewWidgetFormBody renders a NewWidgetForm", () => {
    const wrap = render()
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const formWrap = mount(
      instance.renderNewWidgetFormBody(wrap.props().formWrapperProps)
    )
    expect(formWrap.exists("NewWidgetForm")).to.equal(true)
    expect(formWrap.find("NewWidgetForm").props()).to.include(
      wrap.props().formWrapperProps
    )
    expect(formWrap.find("NewWidgetForm").props()).to.include(
      instance.makeFormProps()
    )
  })
})
