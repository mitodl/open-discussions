// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"

import withForm from "./withForm"

import { wait } from "../lib/util"

describe("withForm", () => {
  const result = { state: "success" }

  let sandbox, formData, formProps
  let formEndEditStub, formBeginEditStub, formUpdateStub, formValidateStub
  let validateFormStub, onSubmitStub, onSubmitResultStub

  const Form = ({ onUpdate, onSubmit, form }) => (
    <form onSubmit={onSubmit}>
      <input type="text" name={form.name} onChange={onUpdate} />
    </form>
  )

  const Page = withForm(Form, ({ renderForm }) => (
    <div>{renderForm(formProps)}</div>
  ))

  const renderPage = () =>
    mount(
      <Page
        form={formData}
        processing={true}
        validateForm={validateFormStub}
        formBeginEdit={formBeginEditStub}
        formEndEdit={formEndEditStub}
        formUpdate={formUpdateStub}
        formValidate={formValidateStub}
        onSubmit={onSubmitStub}
        onSubmitResult={onSubmitResultStub}
      />
    )

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    formEndEditStub = sandbox.stub()
    formBeginEditStub = sandbox.stub()
    formUpdateStub = sandbox.stub()
    formValidateStub = sandbox.stub()
    validateFormStub = sandbox.stub().returns({})
    onSubmitStub = sandbox.stub().resolves(result)
    onSubmitResultStub = sandbox.stub()
    formData = {
      value: {
        name: ""
      },
      errors: {}
    }
    formProps = {}
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should pass the expected props", () => {
    formData = {
      value: {
        name: "s"
      },
      errors: {
        name: "name is too short"
      }
    }
    formProps = {
      hello: "there"
    }

    const wrapper = renderPage()
    const form = wrapper.find(Form)
    const inst = wrapper.instance()

    assert.deepEqual(form.props(), {
      form:       formData.value,
      validation: formData.errors,
      processing: true,
      onUpdate:   inst.onUpdate,
      onSubmit:   inst.onSubmit,
      ...formProps
    })
  })

  it("should call formBeginEdit on mount", () => {
    const wrapper = renderPage()

    assert.ok(wrapper.find(Form).exists())

    assert.ok(formBeginEditStub.calledOnce)
    assert.ok(formBeginEditStub.calledWith())

    assert.ok(formEndEditStub.notCalled)
  })

  it("should call formEndEdit on unmount", () => {
    const wrapper = renderPage()

    wrapper.unmount()

    assert.ok(formEndEditStub.calledOnce)
    assert.ok(formEndEditStub.calledWith())
  })

  it("should update the form", () => {
    const name = "name"
    const value = "Molly"
    const wrapper = renderPage()
    const form = wrapper.find(Form)

    assert.ok(formUpdateStub.notCalled)

    form.find("input").simulate("change", { target: { name, value } })

    assert.ok(formUpdateStub.calledOnce)
    assert.ok(
      formUpdateStub.calledWith({
        [name]: value
      })
    )
  })

  it("should validates and updates form validation if there are errors", () => {
    const wrapper = renderPage()
    const form = wrapper.find(Form)
    const errors = {
      value: {
        name: "name"
      }
    }

    validateFormStub.returns(errors)

    assert.ok(validateFormStub.notCalled)

    form.find("form").simulate("submit")

    assert.ok(validateFormStub.calledOnce)
    assert.ok(validateFormStub.calledWith(formData))

    assert.ok(formValidateStub.calledOnce)
    assert.ok(formValidateStub.calledWith(errors.value))

    assert.ok(onSubmitStub.notCalled)
    assert.ok(onSubmitResultStub.notCalled)
  })

  it("should validates, submits, and handles the result the form on submit", async () => {
    const wrapper = renderPage()
    const form = wrapper.find(Form)

    assert.ok(validateFormStub.notCalled)

    form.find("form").simulate("submit")

    await wait(5) // wait for onSubmit to resolve

    assert.ok(validateFormStub.calledOnce)
    assert.ok(validateFormStub.calledWith(formData))

    assert.ok(onSubmitStub.calledOnce)
    assert.ok(onSubmitStub.calledWith(formData.value))

    assert.ok(onSubmitResultStub.calledOnce)
    assert.ok(onSubmitResultStub.calledWith(result))
  })
})
