// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"

import type { PasswordForm, PasswordFormValidation } from "../../flow/authTypes"

type LoginPasswordFormProps = {
  form: PasswordForm,
  validation: PasswordFormValidation,
  onUpdate: Function,
  onSubmit: Function,
  processing: boolean
}

export default class AuthPasswordForm extends React.Component<*, void> {
  props: LoginPasswordFormProps

  render() {
    const { form, validation, onSubmit, onUpdate, processing } = this.props

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="passwordfield row">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onUpdate}
          />
          {validationMessage(validation.password)}
        </div>
        <div className="actions row">
          <button
            type="submit"
            className={`submit-password ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            Next
          </button>
        </div>
      </form>
    )
  }
}
