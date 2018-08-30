// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"
import type { FormProps } from "../../flow/formTypes"
import type { EmailForm } from "../../flow/authTypes"

type Props = {
  emailApiError: ?string
} & FormProps<EmailForm>

export default class PasswordResetForm extends React.Component<Props> {
  render() {
    const {
      form,
      validation,
      emailApiError,
      onSubmit,
      onUpdate,
      processing
    } = this.props

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="emailfield row">
          <label>We will send a reset email to:</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onUpdate}
          />
          {validationMessage(validation.email)}
          {validationMessage(emailApiError)}
        </div>
        <div className="actions row right-aligned">
          <button
            type="submit"
            className={`submit-password-reset ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            Send Reset Email
          </button>
        </div>
      </form>
    )
  }
}
