// @flow
import React from "react"
import R from "ramda"

import { validationMessage } from "../../lib/validation"

import type { EmailForm } from "../../flow/authTypes"
import type { FormProps } from "../../flow/formTypes"

type LoginFormProps = {
  formError: ?string
} & FormProps<EmailForm>

const AuthEmailForm = ({
  form,
  validation,
  onSubmit,
  onUpdate,
  processing,
  formError
}: LoginFormProps) => {
  return (
    <form onSubmit={onSubmit} className="form">
      <div className="emailfield row">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={onUpdate}
        />
        {validationMessage(validation.email)}
      </div>
      <div className="error row">
        {!processing && R.isEmpty(validation)
          ? validationMessage(formError)
          : null}
      </div>
      <div className="actions row">
        <button
          type="submit"
          className={`submit-login ${processing ? "disabled" : ""}`}
          disabled={processing}
        >
          Next
        </button>
      </div>
    </form>
  )
}

export default AuthEmailForm
