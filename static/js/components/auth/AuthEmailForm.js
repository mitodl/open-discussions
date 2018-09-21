// @flow
/* global SETTINGS:false */
import React from "react"
import ReCAPTCHA from "react-google-recaptcha"

import { validationMessage } from "../../lib/validation"

import type { EmailForm } from "../../flow/authTypes"
import type { FormProps } from "../../flow/formTypes"

const AuthEmailForm = ({
  form,
  validation,
  onSubmit,
  onUpdate,
  onRecaptcha,
  processing
}: FormProps<EmailForm>) => {
  return (
    <form onSubmit={onSubmit} className="form">
      <div className="emailfield row">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={onUpdate}
          placeholder="Email"
        />
        {validationMessage(validation.email)}
      </div>
      {SETTINGS.recaptchaKey && onRecaptcha ? (
        <div className="recaptcha row">
          <ReCAPTCHA sitekey={SETTINGS.recaptchaKey} onChange={onRecaptcha} />
          {validationMessage(validation.recaptcha)}
        </div>
      ) : null}
      <div className="actions row right-aligned">
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
