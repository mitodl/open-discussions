// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"

import withForm from "./withForm"

import { wait } from "../lib/util"
import { shouldIf } from "../lib/test_utils"

import type { FormProps, WithFormProps } from "../flow/formTypes"

type TestForm = {
  name: string
}

type TestFormProps = {
  [string]: any
} & FormProps<TestForm>

type PageProps = {
  extraProps: Object
} & WithFormProps<TestFormProps>

class Form extends React.Component<TestFormProps> {
  render() {
    const { form, validation, onSubmit, onUpdate, processing } = this.props
    return (
      <form onSubmit={onSubmit}>
        <input type="text" name={form.name} onChange={onUpdate} />
        {validation ? <div>{validation.name}</div> : null}
        <button type="submit" disabled={processing}>
          Submit
        </button>
      </form>
    )
  }
}

class Page extends React.Component<*, *> {
  props: PageProps

  render() {
    const { renderForm, extraProps } = this.props
    return <div>{renderForm(extraProps)}</div>
  }
}

const WrappedPage = withForm(Form)(Page)

describe("withForm", () => {
  const result = { state: "success" }

  let sandbox,
    formData: any,
    formEndEditStub,
    formBeginEditStub,
    formUpdateStub,
    formValidateStub,
    validateFormStub,
    onSubmitStub,
    onSubmitResultStub

  const renderPage = ({ ...props } = {}) =>
    mount(
      <WrappedPage
        form={formData}
        processing={true}
        validateForm={validateFormStub}
        formBeginEdit={formBeginEditStub}
        formEndEdit={formEndEditStub}
        formUpdate={formUpdateStub}
        formValidate={formValidateStub}
        onSubmit={onSubmitStub}
        onSubmitResult={onSubmitResultStub}
        onSubmitFailure={sandbox.stub()}
        onUpdate={sandbox.stub()}
        renderForm={sandbox.stub()}
        {...props}
      />
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
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
    const formProps = {
      hello: "there"
    }

    const wrapper = renderPage({ extraProps: formProps })
    const form = wrapper.find(Form)
    const inst = wrapper.instance()

    assert.deepInclude(form.props(), {
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

    sinon.assert.calledOnce(formBeginEditStub)
    sinon.assert.calledWith(formBeginEditStub)

    sinon.assert.notCalled(formEndEditStub)
  })

  it("should call formEndEdit on unmount", () => {
    const wrapper = renderPage()

    wrapper.unmount()

    sinon.assert.calledOnce(formEndEditStub)
    sinon.assert.calledWith(formEndEditStub)
  })

  it("should update the form when onRecaptcha called", () => {
    const wrapper = renderPage()
    wrapper.instance().onRecaptcha("test_recaptcha")
    sinon.assert.calledOnce(formUpdateStub)
    sinon.assert.calledWith(formUpdateStub, {
      ["recaptcha"]: "test_recaptcha"
    })
  })

  it("should update the form for an input", () => {
    const name = "name"
    const value = "Molly"
    const wrapper = renderPage()
    const form = wrapper.find(Form)

    form.find("input").simulate("change", { target: { name, value } })

    sinon.assert.calledOnce(formUpdateStub)
    sinon.assert.calledWith(formUpdateStub, {
      [name]: value
    })
  })

  //
  ;[true, false].forEach(checked => {
    it(`should update the form for a checked == ${checked.toString()} checkbox`, () => {
      const name = "tos"
      const wrapper = renderPage()
      const form = wrapper.find(Form)

      form
        .find("input")
        .simulate("change", { target: { name, type: "checkbox", checked } })

      sinon.assert.calledOnce(formUpdateStub)
      sinon.assert.calledWith(formUpdateStub, {
        [name]: checked
      })
    })
  })

  it("should validate and update form validation if there are errors", () => {
    const wrapper = renderPage()
    const form = wrapper.find(Form)
    const errors = {
      value: {
        name: "name"
      }
    }

    validateFormStub.returns(errors)

    form.find("form").simulate("submit")

    sinon.assert.calledOnce(validateFormStub)
    sinon.assert.calledWith(validateFormStub, formData)

    sinon.assert.calledOnce(formValidateStub)
    sinon.assert.calledWith(formValidateStub, errors.value)

    sinon.assert.notCalled(onSubmitStub)
    sinon.assert.notCalled(onSubmitResultStub)
  })

  it("should validate, submit, and handle the result the form on submit", async () => {
    const wrapper = renderPage()
    const form = wrapper.find(Form)

    form.find("form").simulate("submit")

    await wait(5) // wait for onSubmit to resolve

    sinon.assert.calledOnce(validateFormStub)
    sinon.assert.calledWith(validateFormStub, formData)

    sinon.assert.calledOnce(formValidateStub)
    sinon.assert.calledWith(formValidateStub, {})

    sinon.assert.calledOnce(onSubmitStub)
    sinon.assert.calledWith(onSubmitStub, formData.value)

    sinon.assert.calledOnce(onSubmitResultStub)
    sinon.assert.calledWith(onSubmitResultStub, result)
  })

  describe("onSubmitFailure", () => {
    const onSubmitFailureStub = sinon.stub()

    beforeEach(() => {
      onSubmitFailureStub.reset()
      onSubmitFailureStub.returns({ field: ["error text"] })
    })

    //
    ;[
      [onSubmitFailureStub, true, 2, "is defined"],
      [undefined, false, 1, "is not defined"]
    ].forEach(
      ([
        onSubmitFailureProp,
        expSubmitFailureCall,
        expValidateCallCount,
        desc
      ]) => {
        it(`${shouldIf(
          expSubmitFailureCall
        )} call onSubmitFailure when onSubmit fails and the prop ${desc}`, async () => {
          const wrapper = renderPage({
            onSubmitFailure: onSubmitFailureProp
          })
          const form = wrapper.find(Form)
          const error = "error"
          onSubmitStub.returns(Promise.reject(error))

          form.find("form").simulate("submit")

          await wait(5) // wait for onSubmit to resolve

          sinon.assert.callCount(formValidateStub, expValidateCallCount)
          sinon.assert.calledWith(formValidateStub.firstCall, {})

          sinon.assert.calledOnce(onSubmitStub)
          sinon.assert.calledWith(onSubmitStub, formData.value)

          sinon.assert.notCalled(onSubmitResultStub)

          assert.equal(onSubmitFailureStub.called, expSubmitFailureCall)
          if (expSubmitFailureCall) {
            sinon.assert.calledWith(onSubmitFailureStub, error)
            sinon.assert.calledWith(formValidateStub.lastCall, {
              field: ["error text"]
            })
          }
        })
      }
    )
  })

  describe("getSubmitResultErrors", () => {
    const getSubmitResultErrorsStub = sinon.stub()

    //
    ;[
      [
        getSubmitResultErrorsStub,
        { field: ["error text"] },
        true,
        "is defined and returns an error object"
      ],
      [
        getSubmitResultErrorsStub,
        undefined,
        false,
        "is defined and returns nothing"
      ],
      [undefined, undefined, false, "is not defined"]
    ].forEach(
      ([
        getSubmitResultErrorsProp,
        stubReturnValue,
        expValidationFail,
        desc
      ]) => {
        it(`${shouldIf(
          expValidationFail
        )} add a validation message if the function ${desc}`, async () => {
          getSubmitResultErrorsStub.reset()
          getSubmitResultErrorsStub.returns(stubReturnValue)

          const wrapper = renderPage({
            getSubmitResultErrors: getSubmitResultErrorsProp
          })
          const form = wrapper.find(Form)
          onSubmitStub.returns(Promise.resolve({}))

          form.find("form").simulate("submit")

          await wait(5) // wait for onSubmit to resolve

          sinon.assert.callCount(onSubmitResultStub, expValidationFail ? 0 : 1)
          if (expValidationFail) {
            sinon.assert.calledWith(formValidateStub.lastCall, stubReturnValue)
          }
        })
      }
    )
  })
})
