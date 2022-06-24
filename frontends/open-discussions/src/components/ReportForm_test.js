// @flow
import sinon from "sinon"
import { assert } from "chai"

import ReportForm from "./ReportForm"

import { configureShallowRenderer } from "../lib/test_utils"

describe("ReportForm", () => {
  let sandbox, onUpdateStub, renderForm

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onUpdateStub = sandbox.stub()

    renderForm = configureShallowRenderer(ReportForm, {
      reportForm: {
        reason:     "reason",
        reportType: "comment",
        commentId:  "1"
      },
      validation:  { reason: "" },
      onUpdate:    onUpdateStub,
      description: "description",
      label:       "label"
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

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
