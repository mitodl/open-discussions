// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import PasswordResetConfirmForm from "./PasswordResetConfirmForm"

describe("PasswordResetConfirmForm component", () => {
  let sandbox, onSubmitStub, onUpdateStub, form
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onSubmitStub = sandbox.stub()
    onUpdateStub = sandbox.stub()
    form = {
      new_password:    "",
      re_new_password: ""
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getPasswordInput = wrapper => wrapper.find("input[name='new_password']")
  const getConfirmPasswordInput = wrapper =>
    wrapper.find("input[name='re_new_password']")

  const mountForm = (props = {}) =>
    mount(
      <PasswordResetConfirmForm
        onSubmit={onSubmitStub}
        onUpdate={onUpdateStub}
        form={form}
        validation={{}}
        processing={false}
        {...props}
      />
    )

  it("should render an initial form", () => {
    const wrapper = mountForm()

    assert.equal(getPasswordInput(wrapper).props().value, "")
    assert.equal(getConfirmPasswordInput(wrapper).props().value, "")
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
        new_password:    "Password is required",
        re_new_password: "Passwords must match"
      },
      tokenApiError: "Token is invalid"
    })

    const validationMessages = wrapper.find(".validation-message")
    assert.equal(validationMessages.at(0).text(), "Password is required")
    assert.equal(validationMessages.at(1).text(), "Passwords must match")
    assert.equal(validationMessages.at(2).text(), "Token is invalid")
  })

  it("should call onSubmit when the form is submitted", () => {
    const wrapper = mountForm({ processing: true })
    wrapper.find("form").simulate("submit")
    sinon.assert.calledOnce(onSubmitStub)
  })
})
