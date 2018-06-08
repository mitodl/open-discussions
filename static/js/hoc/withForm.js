// @flow
import React from "react"
import R from "ramda"

import type { ConfiguredFormProps } from "../lib/forms"
import type { FormValue } from "../flow/formTypes"

export type WithFormProps = {
  form: ?FormValue,
  processing: boolean,
  onUpdate: Object => void,
  onSubmit: Object => void,
  onSubmitResult: Function,
  validateForm: Function,
  renderForm: Function
} & ConfiguredFormProps

export type FormProps = {
  form: Object,
  validation: Object,
  processing: boolean,
  onUpdate: Object => void,
  onSubmit: Object => void
}

const withForm = R.curry(
  (
    FormComponent: Class<React.Component<*, FormProps>>,
    WrappedComponent: Class<React.Component<*, WithFormProps>>
  ) => {
    class withForm extends React.Component<*, *> {
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
        const { name, value } = e.target

        formUpdate({
          [name]: value
        })
      }

      onSubmit = (e: Object) => {
        const {
          form,
          formValidate,
          onSubmit,
          onSubmitResult,
          validateForm
        } = this.props

        e.preventDefault()

        const validation = validateForm(form)

        if (!form || !R.isEmpty(validation)) {
          formValidate(validation.value)
        } else {
          onSubmit(form.value).then(onSubmitResult)
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
    return withForm
  }
)

export default withForm
