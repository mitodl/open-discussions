// @flow
import React from "react"
import { connect } from "react-redux"
import { Link } from "react-router-dom"
import R from "ramda"

import Card from "../../components/Card"
import MetaTags from "../../components/MetaTags"
import PasswordResetConfirmForm from "../../components/auth/PasswordResetConfirmForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { validatePasswordResetForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import { FETCH_SUCCESS } from "redux-hammock/constants"

import type { WithFormProps } from "../../flow/formTypes"
import type { ResetConfirmForm } from "../../flow/authTypes"

type PasswordResetConfirmPageProps = {
  tokenApiError: ?Object,
  successfullySubmitted: boolean
} & WithFormProps<ResetConfirmForm>

export const PasswordResetConfirmPage = ({
  renderForm,
  tokenApiError,
  successfullySubmitted
}: PasswordResetConfirmPageProps) => (
  <div className="auth-page password-reset-confirm-page">
    <div className="main-content">
      {successfullySubmitted ? (
        <Card className="login-card">
          <h3>Your password has been reset</h3>
          <p>
            You can use <Link to="/login">this link</Link> to log in.
          </p>
        </Card>
      ) : (
        <Card className="login-card">
          <h3>Enter your new password</h3>

          <MetaTags canonicalLink="password_reset/confirm">
            <title>{formatTitle("Password Reset")} </title>
          </MetaTags>

          {renderForm({ tokenApiError })}
        </Card>
      )}
    </div>
  </div>
)

const passwordResetConfirmForm = () => ({
  new_password:    "",
  re_new_password: ""
})

export const FORM_KEY = "login:password_reset_confirm"
const { getForm, actionCreators } = configureForm(
  FORM_KEY,
  passwordResetConfirmForm
)

const onSubmit = (form: ResetConfirmForm, match: Object) =>
  actions.passwordReset.postNewPassword(
    form.new_password,
    form.re_new_password,
    match.params.token,
    match.params.uid
  )

const mergeProps = mergeAndInjectProps(
  (stateProps, { onSubmit }, { match }) => {
    return {
      onSubmit: form => onSubmit(form, match)
    }
  }
)

const mapStateToProps = state => {
  const form = getForm(state)
  const passwordReset = state.passwordReset
  const tokenApiError = R.view(R.lensPath(["error", "non_field_errors"]))(
    passwordReset
  )
  const successfullySubmitted =
    passwordReset &&
    passwordReset.loaded &&
    !passwordReset.processing &&
    passwordReset.postNewPasswordStatus === FETCH_SUCCESS

  return {
    form,
    validateForm,
    tokenApiError,
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
  withForm(PasswordResetConfirmForm)
)(PasswordResetConfirmPage)
