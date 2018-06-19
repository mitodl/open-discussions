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
  class withForm extends React.Component<*, *> {
    props: WithFormProps<T>

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

    onSubmit = (e?: Object) => {
      const {
        form,
        formValidate,
        onSubmit,
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

export default withForm
