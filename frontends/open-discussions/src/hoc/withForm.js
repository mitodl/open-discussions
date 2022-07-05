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

    onRecaptcha = (response: string) => {
      const { formUpdate } = this.props
      // $FlowFixMe
      formUpdate({
        ["recaptcha"]: response
      })
    }

    onSubmit = async (e?: Object) => {
      const {
        form,
        formValidate,
        onSubmit,
        getSubmitResultErrors,
        onSubmitFailure,
        onSubmitResult,
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
          // If 'getSubmitResultErrors' is defined, it should take the result of
          // 'onSubmit' and return an object if any errors are found.
          const submitResultFieldErrors = getSubmitResultErrors
            ? getSubmitResultErrors(result)
            : null
          // If any errors were found in the 'onSubmit' results, attach them to the form
          // as validation messages.
          if (submitResultFieldErrors) {
            formValidate(submitResultFieldErrors)
          } else if (onSubmitResult) {
            onSubmitResult(result)
          }
        } catch (e) {
          if (onSubmitFailure) {
            // 'onSubmitFailure' should return an object mapping field names to error messages.
            const submitFailureFieldErrors = onSubmitFailure(e)
            formValidate(submitFailureFieldErrors)
          }
        }
      }
    }

    render() {
      const { form, processing, useRecaptcha } = this.props
      const renderForm = props =>
        form ? (
          <FormComponent
            onUpdate={this.onUpdate}
            onSubmit={this.onSubmit}
            onRecaptcha={useRecaptcha ? this.onRecaptcha : null}
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
  withForm.displayName = `withForm(${String(WrappedComponent.name)})`
  return withForm
}

export default withForm
