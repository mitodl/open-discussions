// @flow
import React from "react"
import { Link } from "react-router-dom"

import { Card } from "ol-util" 

import { validationMessage } from "../lib/validation"
import { ACCOUNT_SETTINGS_URL } from "../lib/url"

import type { FormProps } from "../flow/formTypes"
import type { PwChangeForm } from "../flow/authTypes"

type Props = {
  invalidPwError: ?string
} & FormProps<PwChangeForm>

const PasswordChangeForm = ({
  form,
  validation,
  onSubmit,
  onUpdate,
  processing,
  invalidPwError
}: Props) => (
  <React.Fragment>
    <Card>
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
      </form>
    </Card>
    <div className="actions row">
      <Link to={ACCOUNT_SETTINGS_URL} className="link-button cancel">
        Cancel
      </Link>
      <button
        className={`submit-password ${processing ? "disabled" : ""}`}
        disabled={processing}
        onClick={onSubmit}
      >
        Save
      </button>
    </div>
  </React.Fragment>
)

export default PasswordChangeForm
