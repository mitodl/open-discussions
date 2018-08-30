// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"

import { validationMessage } from "../../lib/validation"

import type { DetailsForm } from "../../flow/authTypes"
import type { FormProps } from "../../flow/formTypes"

type AuthDetailsFormProps = {
  formError: ?string
} & FormProps<DetailsForm>

const AuthDetailsForm = ({
  form,
  validation,
  onSubmit,
  onUpdate,
  processing,
  formError
}: AuthDetailsFormProps) => (
  <form onSubmit={onSubmit} className="form">
    <div className="namefield row">
      <label>Full name</label>
      <input
        type="text"
        name="name"
        value={form.name || ""}
        onChange={onUpdate}
      />
      {validationMessage(validation.name)}
    </div>
    <div className="passwordfield row">
      <label>Password</label>
      <input
        type="password"
        name="password"
        value={form.password || ""}
        onChange={onUpdate}
      />
      {validationMessage(validation.password)}
    </div>
    <div className="tos row">
      By creating an account, I agree to the{" "}
      <a
        href={SETTINGS.authenticated_site.tos_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        terms & conditions
      </a>{" "}
    </div>
    <div className="error row">
      {!processing && R.isEmpty(validation)
        ? validationMessage(formError)
        : null}
    </div>
    <div className="actions row right-aligned">
      <button
        type="submit"
        className={`submit-register ${processing ? "disabled" : ""}`}
        disabled={processing}
      >
        Next
      </button>
    </div>
  </form>
)

export default AuthDetailsForm
