import React from "react"
import { expect } from "chai"
import sinon from "sinon"
import { mount } from "enzyme"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import WidgetList from "./WidgetList"
import { apiPath } from "../../lib/widgets"
import { mockTextWidget } from "../../factories/widgets"

describe("<WidgetList />", () => {
  const dummyWidgetListId = 2
  const dummyWidgetId = 3
  const dummyPosition = 10
  const dummyWidgetInstances = [mockTextWidget(dummyWidgetId)]
  const dummyFormProps = { formProp: "dummy-form-prop" }
  let sandbox, fetchStub, dummyProps

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    fetchStub.returns(Promise.resolve(dummyWidgetInstances))

    dummyProps = {
      widgetListId:       dummyWidgetListId,
      fetchData:          fetchStub,
      errorHandler:       sandbox.spy(),
      listWrapperProps:   { listWrapperProp: "dummy-list-wrapper-prop" },
      formWrapperProps:   { formWrapperProp: "dummy-form-wrapper-prop" },
      widgetWrapperProps: { widgetWrapperProp: "dummy-widget-wrapper-prop" }
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const resetSpyHistory = () => {
    dummyProps.errorHandler.resetHistory()
    fetchStub.resetHistory()
  }

  // Default behavior tests
  it("returns null if disableWidgetFramework is true", () => {
    const wrap = mount(
      <WidgetList {...dummyProps} disableWidgetFramework={true} />
    )
    const instance = wrap.instance()

    expect(instance.render()).to.equal(null)
  })

  it("returns loader if no widget instance is loaded", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)

    expect(wrap.exists(".default-loader")).to.equal(true)
  })

  it("runs renderWidgetList is widgetInstances are loaded", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    const renderWidgetListSpy = sinon.spy(instance, "renderWidgetList")
    instance.updateWidgetList(dummyWidgetInstances)
    wrap.update()

    expect(wrap.exists(".widget-list")).to.equal(true)
    expect(renderWidgetListSpy.callCount).to.equal(1)
  })

  // Method Tests
  it("componentDidMount calls loadData", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    const loadDataSpy = sinon.spy(instance, "loadData")
    instance.componentDidMount()

    expect(loadDataSpy.callCount).to.equal(1)
  })

  it("componentDidMount calls loadData only when the widgetListId changes on props", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    const loadDataSpy = sinon.spy(instance, "loadData")
    instance.componentDidUpdate(dummyProps)

    expect(loadDataSpy.callCount).to.equal(0)
    const oldProps = {
      ...dummyProps,
      widgetListId: dummyProps.widgetListId - 1
    }
    instance.componentDidUpdate(oldProps)
    expect(loadDataSpy.callCount).to.equal(1)
  })

  it("loadData calls fetch with widget list id", done => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    const updateWidgetListSpy = sinon.spy(instance, "updateWidgetList")
    fetchStub.resolves(dummyWidgetInstances)
    resetSpyHistory()
    const loadDataTest = async () => {
      await instance.loadData()
      expect(
        fetchStub.withArgs(apiPath("widget_list", dummyWidgetListId)).callCount
      ).to.equal(1)
      expect(
        updateWidgetListSpy.withArgs(dummyWidgetInstances).callCount
      ).to.equal(1)
    }
    loadDataTest().then(done)
  })

  it("updateWidgetList sets the state", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.updateWidgetList(dummyWidgetInstances)

    expect(wrap.state("widgetInstances")).to.equal(dummyWidgetInstances)
  })

  it("deleteWidget calls fetch with the widgetId and a DELETE request", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.deleteWidget(dummyWidgetId)

    expect(
      fetchStub.withArgs(apiPath("widget", dummyWidgetId), { method: "DELETE" })
        .callCount
    ).to.equal(1)
  })

  it("moveWidget calls fetch with the widgetId and a PATCH request", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.moveWidget(dummyWidgetId, dummyPosition)

    expect(
      fetchStub.withArgs(apiPath("widget", dummyWidgetId), {
        method: "PATCH",
        body:   JSON.stringify({ position: dummyPosition })
      }).callCount
    ).to.equal(1)
  })

  it("makePassThroughProps constructs an appropriate set of passThroughProps", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
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
    const wrap = mount(<WidgetList {...dummyProps} />)
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
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const updateWidgetListSpy = sinon.spy(instance, "updateWidgetList")
    const formProps = instance.makeFormProps()

    expect(formProps.widgetListId).to.equal(dummyWidgetListId)
    expect(formProps.listLength).to.equal(dummyWidgetInstances.length)

    resetSpyHistory()
    const dummyUrl = apiPath("widget", dummyWidgetId)
    formProps.fetchData(dummyUrl)
    expect(fetchStub.withArgs(dummyUrl).callCount).to.equal(1)

    const dummyError = "error"
    formProps.errorHandler(dummyError)
    expect(dummyProps.errorHandler.withArgs(dummyError).callCount).to.equal(1)

    formProps.onSubmit(dummyWidgetInstances)
    expect(
      updateWidgetListSpy.withArgs(dummyWidgetInstances).callCount
    ).to.equal(1)

    const { Loader } = formProps
    const loader = mount(<Loader />)
    expect(loader.exists(".default-loader")).to.equal(true)
  })

  it("renderWidgetList renders a ListWrapper", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const listWrap = mount(instance.renderWidgetList())
    expect(listWrap.exists(".default-list-wrapper")).to.equal(true)
    expect(listWrap.props()).to.include(instance.makePassThroughProps())
    expect(listWrap.props()).to.include(dummyProps.listWrapperProps)
  })

  it("renderListBody runs render widget once for each widget in widget instances", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const renderWidgetSpy = sinon.spy(instance, "renderWidget")
    instance.renderListBody(dummyProps.listWrapperProps)

    expect(renderWidgetSpy.callCount).to.equal(dummyWidgetInstances.length)
    dummyWidgetInstances.map(instance => {
      expect(
        renderWidgetSpy.withArgs(instance, dummyProps.listWrapperProps)
          .callCount
      ).to.equal(1)
    })
  })

  it("renderWidget renders a WidgetWrapper", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const dummyWidgetInstance = dummyWidgetInstances[0]
    const dummyWidgetId = dummyWidgetInstance.id

    const widgetWrap = mount(
      instance.renderWidget(dummyWidgetInstance, dummyProps.listWrapperProps)
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

    expect(widgetWrap.props()).to.include(dummyProps.widgetWrapperProps)
    expect(widgetWrap.props()).to.include(dummyProps.listWrapperProps)
  })

  it("renderWidgetBody renders a renderer", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const dummyWidgetInstance = dummyWidgetInstances[0]

    const renderWrap = mount(instance.renderWidgetBody(dummyWidgetInstance))
    expect(renderWrap.exists(".widget-body")).to.equal(true)
    expect(renderWrap.props()).to.include(dummyWidgetInstance)
    expect(renderWrap.props()).to.include(dummyWidgetInstance.configuration)
  })

  it("renderEditWidgetForm renders a FormWrapper", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const renderEditWidgetFormSpy = sinon.spy(
      instance,
      "renderEditWidgetFormBody"
    )

    const formWrap = mount(
      instance.renderEditWidgetForm(dummyWidgetId, dummyProps.listWrapperProps)
    )
    expect(formWrap.exists(".default-form-wrapper")).to.equal(true)
    expect(formWrap.props()).to.include(dummyProps.listWrapperProps)
    expect(formWrap.props()).to.include(dummyProps.formWrapperProps)
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
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const formWrap = mount(
      instance.renderEditWidgetFormBody(
        dummyWidgetId,
        dummyProps.formWrapperProps
      )
    )
    expect(formWrap.exists("EditWidgetForm")).to.equal(true)
    expect(formWrap.find("EditWidgetForm").props()).to.include(
      dummyProps.formWrapperProps
    )
    expect(formWrap.find("EditWidgetForm").props()).to.include(
      instance.makeFormProps()
    )
    expect(formWrap.find("EditWidgetForm").prop("widgetId")).to.equal(
      dummyWidgetId
    )
  })

  it("renderNewWidgetForm renders a FormWrapper", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)
    const renderNewWidgetFormSpy = sinon.spy(
      instance,
      "renderNewWidgetFormBody"
    )

    const formWrap = mount(
      instance.renderNewWidgetForm(dummyProps.listWrapperProps)
    )
    expect(formWrap.exists(".default-form-wrapper")).to.equal(true)
    expect(formWrap.props()).to.include(dummyProps.listWrapperProps)
    expect(formWrap.props()).to.include(dummyProps.formWrapperProps)
    expect(formWrap.props()).to.include(instance.makePassThroughProps())
    formWrap.prop("renderForm")(dummyFormProps)
    expect(renderNewWidgetFormSpy.withArgs(dummyFormProps).callCount).to.equal(
      1
    )
  })

  it("renderNewWidgetFormBody renders a NewWidgetForm", () => {
    const wrap = mount(<WidgetList {...dummyProps} />)
    const instance = wrap.instance()
    instance.updateWidgetList(dummyWidgetInstances)

    const formWrap = mount(
      instance.renderNewWidgetFormBody(dummyProps.formWrapperProps)
    )
    expect(formWrap.exists("NewWidgetForm")).to.equal(true)
    expect(formWrap.find("NewWidgetForm").props()).to.include(
      dummyProps.formWrapperProps
    )
    expect(formWrap.find("NewWidgetForm").props()).to.include(
      instance.makeFormProps()
    )
  })
})
