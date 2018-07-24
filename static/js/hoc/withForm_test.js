// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"

import withForm from "./withForm"

import { wait } from "../lib/util"

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

  let sandbox, formData
  let formEndEditStub, formBeginEditStub, formUpdateStub, formValidateStub
  let validateFormStub, onSubmitStub, onSubmitResultStub, onSubmitErrorStub

  const renderPage = ({ ...props }) =>
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
        onSubmitError={onSubmitErrorStub}
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
    onSubmitErrorStub = sandbox.stub()
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

  it("should update the form for an input", () => {
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

  //
  ;[true, false].forEach(checked => {
    it(`should update the form for a checked == ${checked.toString()} checkbox`, () => {
      const name = "tos"
      const wrapper = renderPage()
      const form = wrapper.find(Form)

      assert.ok(formUpdateStub.notCalled)

      form
        .find("input")
        .simulate("change", { target: { name, type: "checkbox", checked } })

      assert.ok(formUpdateStub.calledOnce)
      assert.ok(
        formUpdateStub.calledWith({
          [name]: checked
        })
      )
    })
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

    validateFormStub.returns({})

    assert.ok(validateFormStub.notCalled)

    form.find("form").simulate("submit")

    await wait(5) // wait for onSubmit to resolve

    assert.ok(validateFormStub.calledOnce)
    assert.ok(validateFormStub.calledWith(formData))

    assert.ok(formValidateStub.calledOnce)
    assert.ok(formValidateStub.calledWith({}))

    assert.ok(onSubmitStub.calledOnce)
    assert.ok(onSubmitStub.calledWith(formData.value))

    assert.ok(onSubmitResultStub.calledOnce)
    assert.ok(onSubmitResultStub.calledWith(result))
  })

  describe("onSubmitError", () => {
    [true, false].forEach(onSubmitErrorExists => {
      it(`handles an error in onSubmit when onSubmitError is ${
        onSubmitErrorExists ? "" : "not "
      }defined`, async () => {
        const wrapper = renderPage({
          onSubmitError: onSubmitErrorExists ? onSubmitErrorStub : undefined
        })
        const form = wrapper.find(Form)

        const error = "error"
        onSubmitStub.returns(Promise.reject(error))
        validateFormStub.returns({})

        assert.ok(validateFormStub.notCalled)

        form.find("form").simulate("submit")

        await wait(5) // wait for onSubmit to resolve

        assert.ok(validateFormStub.calledOnce)
        assert.ok(validateFormStub.calledWith(formData))

        assert.ok(formValidateStub.calledOnce)
        assert.ok(formValidateStub.calledWith({}))

        assert.ok(onSubmitStub.calledOnce)
        assert.ok(onSubmitStub.calledWith(formData.value))

        assert.ok(onSubmitResultStub.notCalled)
        if (onSubmitErrorExists) {
          assert.ok(onSubmitErrorStub.calledOnce)
          assert.ok(onSubmitErrorStub.calledWith(error))
        } else {
          assert.ok(onSubmitErrorStub.notCalled)
        }
      })
    })
  })
})
