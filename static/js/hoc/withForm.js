// @flow
import React from "react"
import R from "ramda"

import type {
  FormComponentCls,
  WrappedComponentCls,
  WithFormProps
} from "../flow/formTypes"

const withForm = <T>(FormComponent: FormComponentCls<T>) => (
  WrappedComponent: WrappedComponentCls<T>
) => {
  class withForm extends React.Component<WithFormProps<T>> {
    static WrappedComponent: WrappedComponentCls<T>

    componentDidMount() {
      const { formBeginEdit } = this.props
      formBeginEdit()
    }

    componentWillUnmount() {
      const { formEndEdit } = this.props
      formEndEdit()
    }

    onUpdate = (e: Object) => {
      const { formUpdate } = this.props
      const { name, type } = e.target

      let value
      if (type === "checkbox") {
        value = e.target.checked
      } else {
        value = e.target.value
      }

      formUpdate({
        [name]: value
      })
    }

    onSubmit = async (e?: Object) => {
      const {
        form,
        formValidate,
        onSubmit,
        onSubmitResult,
        onSubmitError,
        validateForm
      } = this.props

      if (e) {
        e.preventDefault()
      }

      if (!form) {
        return
      }

      const validation = validateForm(form)

      formValidate(R.isEmpty(validation) ? {} : validation.value)

      if (R.isEmpty(validation)) {
        try {
          const result = await onSubmit(form.value)
          if (onSubmitResult) {
            onSubmitResult(result)
          }
        } catch (e) {
          if (onSubmitError) {
            onSubmitError(e)
          }
        }
      }
    }

    render() {
      const { form, processing } = this.props
      const renderForm = props =>
        form ? (
          <FormComponent
            onUpdate={this.onUpdate}
            onSubmit={this.onSubmit}
            processing={processing}
            form={form.value}
            validation={form.errors}
            {...props}
          />
        ) : null
      return <WrappedComponent {...this.props} renderForm={renderForm} />
    }
  }

  withForm.WrappedComponent = WrappedComponent

  return withForm
}

export default withForm
