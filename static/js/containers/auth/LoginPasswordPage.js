// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import AuthPasswordForm from "../../components/auth/AuthPasswordForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processLoginResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { LOGIN_URL } from "../../lib/url"
import { validatePasswordForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"

import type { PasswordForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../hoc/withForm"

const getPartialToken = R.path(["auth", "data", "partial_token"])

type LoginPasswordPageProps = {
  history: Object,
  partialToken: string
} & WithFormProps

const LoginPasswordPage = ({ renderForm }: LoginPasswordPageProps) => (
  <div className="content auth-page login-password-page">
    <div className="main-content">
      <Card className="login-card">
        <h3>Log In</h3>
        <DocumentTitle title={formatTitle("Log In")} />
        {renderForm()}
      </Card>
    </div>
  </div>
)

const newPasswordForm = () => ({ password: "" })

const { getForm, actionCreators } = configureForm(
  "login:password",
  newPasswordForm
)

const onSubmit = (partialToken: string, form: PasswordForm) =>
  actions.auth.loginPassword(partialToken, form.password)

const onSubmitResult = R.curry(processLoginResponse)

const formBeginEditIfPartial = (
  formBeginEdit: Function,
  history: Object,
  partialToken: ?string
) => () => {
  if (partialToken) {
    formBeginEdit()
  } else {
    history.push(LOGIN_URL)
  }
}

const mergeProps = mergeAndInjectProps(
  ({ partialToken }, { formBeginEdit, onSubmit }, { history }) => ({
    formBeginEdit:  formBeginEditIfPartial(formBeginEdit, history, partialToken),
    onSubmit:       (form: PasswordForm) => onSubmit(partialToken, form),
    onSubmitResult: onSubmitResult(history)
  })
)

const mapStateToProps = state => {
  const form = getForm(state)
  const partialToken = getPartialToken(state)
  const processing = state.auth.processing

  return {
    form,
    partialToken,
    processing,
    onSubmitResult,
    validateForm
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
  withForm(AuthPasswordForm)
)(LoginPasswordPage)
