// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"
import type { FormProps } from "../../flow/formTypes"
import type { EmailForm } from "../../flow/authTypes"

type Props = {
  emailApiError: ?string
} & FormProps<EmailForm>

const PasswordResetForm = ({
  form,
  validation,
  onSubmit,
  onUpdate,
  processing
}: Props) => (
  <form onSubmit={onSubmit} className="form">
    <div className="emailfield row">
      <label>We will send a reset email to:</label>
      <input type="email" name="email" value={form.email} onChange={onUpdate} />
      {validationMessage(validation.email)}
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

export default PasswordResetForm
