// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import AuthDetailsForm from "./AuthDetailsForm"

describe("AuthDetailsForm component", () => {
  let sandbox, onSubmitStub, onUpdateStub, form
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onSubmitStub = sandbox.stub()
    onUpdateStub = sandbox.stub()
    form = {
      name:     "",
      password: ""
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getNameInput = wrapper => wrapper.find("input[name='name']")
  const getPasswordInput = wrapper => wrapper.find("input[name='password']")

  const mountForm = (props = {}) =>
    mount(
      <AuthDetailsForm
        onSubmit={onSubmitStub}
        onUpdate={onUpdateStub}
        form={form}
        validation={{}}
        processing={false}
        formError={""}
        {...props}
      />
    )

  it("should render an initial form", () => {
    const wrapper = mountForm()

    assert.equal(getNameInput(wrapper).props().value, "")
    assert.equal(getPasswordInput(wrapper).props().value, "")
    assert.equal(wrapper.find(".validation-message").exists(), false)
    assert.equal(wrapper.find("button").props().disabled, false)
  })

  it("should disable the submit button if processing === true", () => {
    const wrapper = mountForm({ processing: true })

    assert.equal(wrapper.find("button").props().disabled, true)
  })

  it("should show validation", () => {
    const wrapper = mountForm({
      validation: {
        password: "Password is required",
        name:     "Name is required"
      },
      formError: "error"
    })

    assert.equal(
      wrapper
        .find(".validation-message")
        .at(0)
        .text(),
      "Name is required"
    )
    assert.equal(
      wrapper
        .find(".validation-message")
        .at(1)
        .text(),
      "Password is required"
    )

    // form level error shouldn't show
    assert.isNotOk(wrapper.find(".row.error .validation-message").exists())
  })

  it("should show a form level error", () => {
    const wrapper = mountForm({ formError: "backend error" })
    assert.equal(
      wrapper
        .find(".validation-message")
        .at(0)
        .text(),
      "backend error"
    )
  })

  //
  ;["password", "name"].forEach(name => {
    it(`should call onUpdate when the ${name} input text changes`, () => {
      const wrapper = mountForm({ processing: true })
      const event = {
        target: {
          name,
          value: "password1"
        }
      }
      getPasswordInput(wrapper).simulate("change", event)
      sinon.assert.calledOnce(onUpdateStub)
      const eventArg = onUpdateStub.firstCall.args[0]
      assert.equal(eventArg.target.name, event.target.name)
      assert.equal(eventArg.target.value, event.target.value)
    })
  })

  it("should call onSubmit when the form is submitted", () => {
    const wrapper = mountForm({ processing: true })
    wrapper.find("form").simulate("submit")
    sinon.assert.calledOnce(onSubmitStub)
  })
})
