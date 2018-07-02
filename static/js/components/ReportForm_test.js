// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import ReportForm from "./ReportForm"

describe("ReportForm", () => {
  let sandbox, onUpdateStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onUpdateStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderForm = (
    reportForm = {
      reason:     "reason",
      reportType: "comment",
      commentId:  "1"
    },
    validation = { reason: "" }
  ) =>
    mount(
      <ReportForm
        reportForm={reportForm}
        validation={validation}
        onUpdate={onUpdateStub}
        description="description"
        label="label"
      />
    )

  it("displays the description and label", () => {
    const wrapper = renderForm()
    assert.equal(wrapper.find("p").text(), "description")
    assert.equal(wrapper.find("label").text(), "label")
  })

  it("calls onUpdate", () => {
    const wrapper = renderForm()
    const event = {
      target: {
        name:  "reason",
        value: "abc"
      }
    }
    wrapper.find("input").simulate("change", event)
    assert.ok(onUpdateStub.called)
  })
})
