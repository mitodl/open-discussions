// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import ReCAPTCHA from "react-google-recaptcha"

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
  onRecaptcha,
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
      {SETTINGS.recaptchaKey && onRecaptcha ? (
        <div className="recaptcha row">
          <ReCAPTCHA sitekey={SETTINGS.recaptchaKey} onChange={onRecaptcha} />,
          {validationMessage(validation.recaptcha)}
        </div>
      ) : null}
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
