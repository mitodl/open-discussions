// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"
import type { FormProps } from "../../flow/formTypes"
import type { ResetConfirmForm } from "../../flow/authTypes"

type PasswordResetConfirmFormProps = {
  tokenApiError: ?string
} & FormProps<ResetConfirmForm>

export default class PasswordResetConfirmForm extends React.Component<*, void> {
  props: PasswordResetConfirmFormProps

  render() {
    const {
      form,
      validation,
      tokenApiError,
      onSubmit,
      onUpdate,
      processing
    } = this.props

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="passwordfield row">
          <label>New Password</label>
          <input
            type="password"
            name="new_password"
            value={form.new_password}
            onChange={onUpdate}
          />
          {validationMessage(validation.new_password)}
        </div>
        <div className="passwordfield row">
          <label>Confirm Password</label>
          <input
            type="password"
            name="re_new_password"
            value={form.re_new_password}
            onChange={onUpdate}
          />
          {validationMessage(validation.re_new_password)}
        </div>
        <div className="actions row">
          <button
            type="submit"
            className={`submit-password ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            Submit
          </button>
          {validationMessage(tokenApiError)}
        </div>
      </form>
    )
  }
}
