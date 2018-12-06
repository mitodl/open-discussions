import React from "react"
import sinon from "sinon"
import { mount } from "enzyme/build"
import { expect } from "chai"

import FormWrapper from "./FormWrapper"

describe("<FormWrapper />", () => {
  const dummyData = { data: "dummyData" }
  const dummyProps = {
    updateWidgetList: sinon.spy(),
    renderForm:       sinon.spy(),
    closeForm:        sinon.spy()
  }

  const resetSpyHistory = () => {
    dummyProps.updateWidgetList.resetHistory()
    dummyProps.renderForm.resetHistory()
    dummyProps.closeForm.resetHistory()
  }

  // Method tests:
  it("calls only renderForm by default", () => {
    mount(<FormWrapper {...dummyProps} />)

    expect(dummyProps.renderForm.callCount).to.equal(1)
    expect(dummyProps.updateWidgetList.callCount).to.equal(0)
    expect(dummyProps.closeForm.callCount).to.equal(0)
  })

  it("submitAndClose only renderForm by default", () => {
    resetSpyHistory()
    const wrap = mount(<FormWrapper {...dummyProps} />)

    const instance = wrap.instance()
    instance.submitAndClose(dummyData)

    expect(dummyProps.renderForm.callCount).to.equal(1)
    expect(dummyProps.updateWidgetList.withArgs(dummyData).callCount).to.equal(
      1
    )
    expect(dummyProps.closeForm.callCount).to.equal(1)
  })

  // Click event tests:
  it("cancel button calls closeForm", () => {
    resetSpyHistory()
    const wrap = mount(<FormWrapper {...dummyProps} />)
    expect(wrap.exists(".widget-form-cancel-btn")).to.equal(true)
    wrap.find(".widget-form-cancel-btn").simulate("click")

    expect(dummyProps.renderForm.callCount).to.equal(1)
    expect(dummyProps.updateWidgetList.callCount).to.equal(0)
    expect(dummyProps.closeForm.callCount).to.equal(1)
  })
})
