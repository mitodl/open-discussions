// @flow
import React from "react"

import { suggestEmail } from "../../lib/email"
import { preventDefaultAndInvoke } from "../../lib/util"
import { validationMessage, validEmail } from "../../lib/validation"

import type { EmailForm, EmailFormValidation } from "../../flow/authTypes"

type LoginFormProps = {
  form: EmailForm,
  validation: EmailFormValidation,
  onUpdate: Function,
  onSubmit: Function,
  processing: boolean
}

export default class AuthEmailForm extends React.Component<*, void> {
  props: LoginFormProps

  render() {
    const { form, validation, onSubmit, onUpdate, processing } = this.props

    const suggestion = validEmail(form.email) ? suggestEmail(form.email) : null

    return (
      <form onSubmit={onSubmit}>
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
}
