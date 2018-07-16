// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"
import { Router } from "react-router"
import { createMemoryHistory } from "history"

import PasswordChangeForm from "./PasswordChangeForm"

describe("PasswordChangeForm component", () => {
  let sandbox, onSubmitStub, onUpdateStub, form, browserHistory

  beforeEach(() => {
    browserHistory = createMemoryHistory()
    sandbox = sinon.sandbox.create()
    onSubmitStub = sandbox.stub()
    onUpdateStub = sandbox.stub()
    form = {
      current_password: "",
      new_password:     ""
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getPasswordInput = wrapper =>
    wrapper.find("input[name='current_password']")
  const getNewPasswordInput = wrapper =>
    wrapper.find("input[name='new_password']")

  const mountForm = (props = {}) =>
    mount(
      <Router history={browserHistory}>
        <PasswordChangeForm
          onSubmit={onSubmitStub}
          onUpdate={onUpdateStub}
          form={form}
          validation={{}}
          processing={false}
          {...props}
        />
      </Router>
    )

  it("should render an initial form", () => {
    const wrapper = mountForm()

    assert.equal(getPasswordInput(wrapper).props().value, "")
    assert.equal(getNewPasswordInput(wrapper).props().value, "")
    assert.equal(wrapper.find(".validation-message").exists(), false)
    assert.equal(wrapper.find("button").props().disabled, false)
  })

  it("should disable the submit button if processing === true", () => {
    const wrapper = mountForm({ processing: true })

    assert.equal(wrapper.find("button").props().disabled, true)
  })

  it("should show error messages if there is a failure in validation or the API call", () => {
    const wrapper = mountForm({
      validation: {
        current_password: "Password is required",
        new_password:     "New password is required"
      },
      invalidPwError: "Invalid password"
    })

    const validationMessages = wrapper.find(".validation-message")
    assert.equal(validationMessages.at(0).text(), "Password is required")
    assert.equal(validationMessages.at(1).text(), "Invalid password")
    assert.equal(validationMessages.at(2).text(), "New password is required")
  })

  it("should call onSubmit when the form is submitted", () => {
    const wrapper = mountForm({ processing: true })
    wrapper.find("form").simulate("submit")
    sinon.assert.calledOnce(onSubmitStub)
  })
})
