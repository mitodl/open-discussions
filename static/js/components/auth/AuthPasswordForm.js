// @flow
import React from "react"
import { Link } from "react-router-dom"

import { validationMessage } from "../../lib/validation"

import type { PasswordForm } from "../../flow/authTypes"
import type { FormProps } from "../../flow/formTypes"

const AuthPasswordForm = ({
  form,
  validation,
  onSubmit,
  onUpdate,
  processing
}: FormProps<PasswordForm>) => (
  <form onSubmit={onSubmit} className="form">
    <div className="passwordfield row">
      <input
        type="password"
        name="password"
        value={form.password}
        onChange={onUpdate}
      />
      {validationMessage(validation.password)}
    </div>
    <div className="row">
      <Link className="password-reset" to="/password_reset">
        Forgot your password?
      </Link>
    </div>
    <div className="actions row right-aligned">
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

export default AuthPasswordForm
