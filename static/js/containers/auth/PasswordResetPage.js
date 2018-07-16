// @flow
import React from "react"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { FETCH_SUCCESS } from "redux-hammock/constants"
import R from "ramda"

import Card from "../../components/Card"
import PasswordResetForm from "../../components/auth/PasswordResetForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"

import type { WithFormProps } from "../../flow/formTypes"
import type { EmailForm } from "../../flow/authTypes"

type PasswordResetPageProps = {
  emailApiError: ?Object,
  successfullySubmitted: boolean
} & WithFormProps<EmailForm>

export const PasswordResetPage = ({
  renderForm,
  emailApiError,
  successfullySubmitted
}: PasswordResetPageProps) => (
  <div className="content auth-page password-reset-page">
    <div className="main-content">
      {successfullySubmitted ? (
        <Card className="login-card">
          <h3>Thank you!</h3>
          <p>
            We've emailed you instructions for setting your password. You should
            receive them shortly.
          </p>
        </Card>
      ) : (
        <Card className="login-card">
          <MetaTags>
            <title>{formatTitle("Password Reset")}</title>
          </MetaTags>
          <h3>Forgot your password?</h3>
          {renderForm({ emailApiError })}
        </Card>
      )}
    </div>
  </div>
)

const passwordResetForm = () => ({ email: "" })

export const FORM_KEY = "login:email"
const { getForm, actionCreators } = configureForm(FORM_KEY, passwordResetForm)

const onSubmit = (form: EmailForm) =>
  actions.passwordReset.postEmail(form.email)

const mergeProps = mergeAndInjectProps((stateProps, { onSubmit }) => {
  return {
    onSubmit: form => onSubmit(form)
  }
})

const mapStateToProps = state => {
  const form = getForm(state)
  const passwordReset = state.passwordReset
  const emailApiError = R.view(R.lensPath(["error", "email"]))(passwordReset)
  const successfullySubmitted =
    passwordReset &&
    passwordReset.loaded &&
    !passwordReset.processing &&
    passwordReset.postEmailStatus === FETCH_SUCCESS

  return {
    form,
    validateForm,
    emailApiError,
    successfullySubmitted
  }
}

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(PasswordResetForm)
)(PasswordResetPage)
