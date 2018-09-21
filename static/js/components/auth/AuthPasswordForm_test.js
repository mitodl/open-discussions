// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"
import { Router } from "react-router"
import { createMemoryHistory } from "history"

import AuthPasswordForm from "./AuthPasswordForm"

describe("AuthPasswordForm component", () => {
  let sandbox, onSubmitStub, onUpdateStub, form, browserHistory

  beforeEach(() => {
    browserHistory = createMemoryHistory()
    sandbox = sinon.createSandbox()
    onSubmitStub = sandbox.stub()
    onUpdateStub = sandbox.stub()
    form = {
      password: ""
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getPasswordInput = wrapper => wrapper.find("input[name='password']")

  const mountForm = (props = {}) =>
    mount(
      <Router history={browserHistory}>
        <AuthPasswordForm
          onSubmit={onSubmitStub}
          onUpdate={onUpdateStub}
          form={form}
          validation={{}}
          processing={false}
          formError={""}
          {...props}
        />
      </Router>
    )

  it("should render an initial form", () => {
    const wrapper = mountForm()

    assert.equal(getPasswordInput(wrapper).props().value, "")
    assert.equal(wrapper.find(".validation-message").exists(), false)
    assert.equal(wrapper.find("button").props().disabled, false)
    assert.equal(wrapper.find("Link").prop("to"), "/password_reset")
  })

  it("should disable the submit button if processing === true", () => {
    const wrapper = mountForm({ processing: true })

    assert.equal(wrapper.find("button").props().disabled, true)
  })

  it("should show validation", () => {
    const wrapper = mountForm({
      validation: {
        password: "Password is required"
      },
      formError: "error"
    })

    assert.equal(
      wrapper.find(".validation-message").text(),
      "Password is required"
    )

    // form level error shouldn't show
    assert.isNotOk(wrapper.find(".row.error .validation-message").exists())
  })

  it("should call onUpdate when the input text changes", () => {
    const wrapper = mountForm({ processing: true })
    const event = {
      target: {
        name:  "password",
        value: "password1"
      }
    }
    getPasswordInput(wrapper).simulate("change", event)
    sinon.assert.calledOnce(onUpdateStub)
    const eventArg = onUpdateStub.firstCall.args[0]
    assert.equal(eventArg.target.name, event.target.name)
    assert.equal(eventArg.target.value, event.target.value)
  })

  it("should call onSubmit when the form is submitted", () => {
    const wrapper = mountForm({ processing: true })
    wrapper.find("form").simulate("submit")
    sinon.assert.calledOnce(onSubmitStub)
  })
})
