import React from "react"
import sinon from "sinon"
import { mount } from "enzyme/build"
import { expect } from "chai"

import WidgetWrapper from "./WidgetWrapper"

describe("<WidgetWrapper />", () => {
  const dummyPos = 3
  const dummyId = 12
  const dummyListLength = 9
  const dummyProps = {
    position:     dummyPos,
    id:           dummyId,
    listLength:   dummyListLength,
    editMode:     false,
    renderWidget: sinon.spy(),
    moveWidget:   sinon.spy(),
    editWidget:   sinon.spy(),
    deleteWidget: sinon.spy()
  }

  const resetSpyHistory = () => {
    dummyProps.renderWidget.resetHistory()
    dummyProps.moveWidget.resetHistory()
    dummyProps.deleteWidget.resetHistory()
    dummyProps.editWidget.resetHistory()
  }

  // Method tests: Ensure that the component methods call the appropriate prop function
  it("calls renderWidget and no other prop functions by default", () => {
    resetSpyHistory()
    mount(<WidgetWrapper {...dummyProps} />)

    expect(dummyProps.renderWidget.callCount).to.equal(1)
    expect(dummyProps.moveWidget.callCount).to.equal(0)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })

  it("moveWidgetUp calls moveWidget once with pos - 1", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.moveWidgetUp()

    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.withArgs(dummyPos - 1).callCount).to.equal(1)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })

  it("moveWidgetDown calls moveWidget once with pos + 1", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.moveWidgetDown()

    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.withArgs(dummyPos + 1).callCount).to.equal(1)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })

  it("editWidget calls editWidget with id", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.editWidget(dummyId)

    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.callCount).to.equal(0)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.withArgs(dummyId).callCount).to.equal(1)
  })

  it("deleteWidget calls deleteWidget", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} />)
    const instance = wrap.instance()
    resetSpyHistory()
    instance.deleteWidget()

    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.callCount).to.equal(0)
    expect(dummyProps.deleteWidget.callCount).to.equal(1)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })

  it("renderEditBar returns an edit bar with four buttons", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} />)
    const instance = wrap.instance()
    const editBar = mount(instance.renderEditBar())

    expect(
      editBar
        .find(".edit-widget-bar")
        .children()
        .filter("button")
    ).to.have.length(4)
  })

  // Click event tests: Ensure that all the click events behave appropriately
  it("first edit-widget-bar button calls moveWidgetUp on click", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} editMode={true} />)
    resetSpyHistory()

    wrap
      .find(".edit-widget-bar")
      .childAt(0)
      .simulate("click")
    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.withArgs(dummyPos - 1).callCount).to.equal(1)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })

  it("first edit-widget-bar button is disabled if pos is 0", () => {
    const wrap = mount(
      <WidgetWrapper {...dummyProps} position={0} editMode={true} />
    )

    expect(
      wrap
        .find(".edit-widget-bar")
        .childAt(0)
        .prop("disabled")
    ).to.equal(true)
  })

  it("second edit-widget-bar button calls moveWidgetDown on click", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} editMode={true} />)
    resetSpyHistory()

    wrap
      .find(".edit-widget-bar")
      .childAt(1)
      .simulate("click")
    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.withArgs(dummyPos + 1).callCount).to.equal(1)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })

  it("first edit-widget-bar button is disabled if pos is listLength - 1", () => {
    const wrap = mount(
      <WidgetWrapper
        {...dummyProps}
        position={dummyProps.listLength - 1}
        editMode={true}
      />
    )

    expect(
      wrap
        .find(".edit-widget-bar")
        .childAt(1)
        .prop("disabled")
    ).to.equal(true)
  })

  it("third edit-widget-bar button calls editWidget on click", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} editMode={true} />)
    resetSpyHistory()

    wrap
      .find(".edit-widget-bar")
      .childAt(2)
      .simulate("click")
    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.callCount).to.equal(0)
    expect(dummyProps.deleteWidget.callCount).to.equal(0)
    expect(dummyProps.editWidget.withArgs(dummyId).callCount).to.equal(1)
  })

  it("fourth edit-widget-bar button calls deleteWidget on click", () => {
    const wrap = mount(<WidgetWrapper {...dummyProps} editMode={true} />)
    resetSpyHistory()

    wrap
      .find(".edit-widget-bar")
      .childAt(3)
      .simulate("click")
    expect(dummyProps.renderWidget.callCount).to.equal(0)
    expect(dummyProps.moveWidget.callCount).to.equal(0)
    expect(dummyProps.deleteWidget.callCount).to.equal(1)
    expect(dummyProps.editWidget.callCount).to.equal(0)
  })
})
