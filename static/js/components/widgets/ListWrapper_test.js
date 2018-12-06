import React from "react"
import sinon from "sinon"
import { mount } from "enzyme/build"
import { expect } from "chai"

import ListWrapper from "./ListWrapper"

describe("<ListWrapper />", () => {
  const dummyId = 3
  const dummyProps = {
    renderNewWidgetForm:  sinon.spy(),
    renderEditWidgetForm: sinon.spy(),
    renderList:           sinon.spy()
  }

  const resetSpyHistory = () => {
    dummyProps.renderNewWidgetForm.resetHistory()
    dummyProps.renderEditWidgetForm.resetHistory()
    dummyProps.renderList.resetHistory()
  }

  // Method + state tests: Ensure that methods set state appropriately or return well-formed sub-components
  it("sets default state appropriately", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)

    expect(wrap.state("editMode")).to.equal(false)
    expect(wrap.state("addWidgetForm")).to.equal(false)
    expect(wrap.state("editWidgetForm")).to.equal(null)
  })

  it("addWidget sets addWidgetForm to true ", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    instance.addWidget()
    wrap.update()

    expect(wrap.state("addWidgetForm")).to.equal(true)
    expect(wrap.state("editWidgetForm")).to.equal(null)
    expect(wrap.state("editMode")).to.equal(true)
  })

  it("renderAddWidgetButton returns an add-widget-btn", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    const btn = mount(instance.renderAddWidgetButton())

    expect(btn.exists(".add-widget-btn")).to.equal(true)
  })

  it("closeForm sets addWidgetForm to false and editWidgetForm to null", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    wrap.setState({
      addWidgetForm:  true,
      editWidgetForm: 3
    })

    const instance = wrap.instance()
    instance.closeForm()

    expect(wrap.state("editMode")).to.equal(false)
    expect(wrap.state("addWidgetForm")).to.equal(false)
    expect(wrap.state("editWidgetForm")).to.equal(null)
  })

  it("toggleEditMode toggles the editMode in state", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    instance.toggleEditMode()

    expect(wrap.state("editMode")).to.equal(true)
    expect(wrap.state("addWidgetForm")).to.equal(false)
    expect(wrap.state("editWidgetForm")).to.equal(null)

    instance.toggleEditMode()

    expect(wrap.state("editMode")).to.equal(false)
    expect(wrap.state("addWidgetForm")).to.equal(false)
    expect(wrap.state("editWidgetForm")).to.equal(null)
  })

  it("editWidget sets editWidgetForm to an id", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    const dummyId = 3
    instance.editWidget(dummyId)

    expect(wrap.state("editWidgetForm")).to.equal(dummyId)
    expect(wrap.state("addWidgetForm")).to.equal(false)
    expect(wrap.state("editMode")).to.equal(true)

    instance.editWidget(dummyId + 1)

    expect(wrap.state("editWidgetForm")).to.equal(dummyId + 1)
    expect(wrap.state("addWidgetForm")).to.equal(false)
    expect(wrap.state("editMode")).to.equal(true)
  })

  // Method + render: Ensure that method calls cause the appropriate components to be rendered
  it("calls renderList and no other form render functions by default", () => {
    resetSpyHistory()
    mount(<ListWrapper {...dummyProps} />)

    expect(dummyProps.renderNewWidgetForm.callCount).to.equal(0)
    expect(dummyProps.renderEditWidgetForm.callCount).to.equal(0)
    expect(dummyProps.renderList.callCount).to.equal(1)
  })

  it("addWidget causes just renderNewWidgetForm to be called", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.addWidget()

    expect(dummyProps.renderNewWidgetForm.callCount).to.equal(1)
    expect(dummyProps.renderEditWidgetForm.callCount).to.equal(0)
    expect(dummyProps.renderList.callCount).to.equal(1)
  })

  it("editWidget causes just renderEditWidgetForm to be called", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.editWidget(dummyId)

    expect(dummyProps.renderNewWidgetForm.callCount).to.equal(0)
    expect(
      dummyProps.renderEditWidgetForm.withArgs(dummyId).callCount
    ).to.equal(1)
    expect(dummyProps.renderList.callCount).to.equal(1)
  })

  it("toggleEditWidget causes renderAddWidgetButton to be called", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    const renderAddWidgetButtonSpy = sinon.spy(
      instance,
      "renderAddWidgetButton"
    )
    instance.toggleEditMode()

    expect(renderAddWidgetButtonSpy.callCount).to.equal(1)
    expect(dummyProps.renderNewWidgetForm.callCount).to.equal(0)
    expect(dummyProps.renderEditWidgetForm.callCount).to.equal(0)
    expect(dummyProps.renderList.callCount).to.equal(1)
  })

  // Click event tests: Test that the various buttons cause the appropriate reactions
  it("edit-widget-list-btn calls toggleEditMode on click", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    const toggleEditModeSpy = sinon.spy(instance, "toggleEditMode")
    const btn = mount(instance.render())

    btn.find(".edit-widget-list-btn").simulate("click")
    expect(toggleEditModeSpy.callCount).to.equal(1)
  })

  it("add-widget-btn calls addWidget on click", () => {
    const wrap = mount(<ListWrapper {...dummyProps} />)
    const instance = wrap.instance()
    const addWidgetSpy = sinon.spy(instance, "addWidget")
    const btn = mount(instance.renderAddWidgetButton())

    expect(btn.exists(".add-widget-btn")).to.equal(true)
    btn.find(".add-widget-btn").simulate("click")
    expect(addWidgetSpy.callCount).to.equal(1)
  })
})
