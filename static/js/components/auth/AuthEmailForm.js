// @flow
import React from "react"
import R from "ramda"

import { suggestEmail } from "../../lib/email"
import { preventDefaultAndInvoke } from "../../lib/util"
import { validationMessage, validEmail } from "../../lib/validation"

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
  const suggestion = validEmail(form.email) ? suggestEmail(form.email) : null

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
        {suggestion && !validation.email ? (
          <div className="validation-message">
            Did you mean{" "}
            <a
              href="#"
              onClick={preventDefaultAndInvoke(() =>
                onUpdate({
                  target: {
                    name:  "email",
                    value: suggestion.full
                  }
                })
              )}
            >
              {suggestion.full}
            </a>?
          </div>
        ) : null}
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
