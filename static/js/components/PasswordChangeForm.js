// @flow
import React from "react"
import { Link } from "react-router-dom"

import { validationMessage } from "../lib/validation"
import { ACCOUNT_SETTINGS_URL } from "../lib/url"

import type { FormProps } from "../flow/formTypes"
import type { PwChangeForm } from "../flow/authTypes"

type Props = {
  invalidPwError: ?string
} & FormProps<PwChangeForm>

export default class PasswordChangeForm extends React.Component<Props> {
  render() {
    const {
      form,
      validation,
      onSubmit,
      onUpdate,
      processing,
      invalidPwError
    } = this.props

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="passwordfield row">
          <label>Current Password</label>
          <input
            type="password"
            name="current_password"
            value={form.current_password}
            onChange={onUpdate}
          />
          {validationMessage(validation.current_password)}
          {validationMessage(invalidPwError)}
        </div>
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
        <div className="actions row">
          <Link to={ACCOUNT_SETTINGS_URL} className="buttonLink cancel">
            Cancel
          </Link>
          <button
            type="submit"
            className={`submit-password ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            Save
          </button>
        </div>
      </form>
    )
  }
}
