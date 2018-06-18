// @flow
/* global SETTINGS:false */
import React from "react"

import { validationMessage } from "../../lib/validation"

import type { DetailsForm, DetailsFormValidation } from "../../flow/authTypes"

type AuthDetailsFormProps = {
  form: DetailsForm,
  validation: DetailsFormValidation,
  onUpdate: Function,
  onSubmit: Function,
  processing: boolean
}

export default class AuthDetailsForm extends React.Component<*, void> {
  props: AuthDetailsFormProps

  render() {
    const { form, validation, onSubmit, onUpdate, processing } = this.props

    return (
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
          <a href={SETTINGS.authenticated_site.tos_url}>terms & conditions</a>{" "}
        </div>
        <div className="actions row">
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
  }
}
