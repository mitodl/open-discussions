// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processLoginResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"

import type { EmailForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../hoc/withForm"

type LoginPageProps = {
  history: Object
} & WithFormProps

const LoginPage = ({ renderForm }: LoginPageProps) => (
  <div className="content auth-page login-page">
    <div className="main-content">
      <Card className="login-card">
        <h3>Log In</h3>
        <DocumentTitle title={formatTitle("Log In")} />
        {renderForm()}
        <hr />
      </Card>
    </div>
  </div>
)

const newEmailForm = () => ({ email: "" })

const onSubmit = ({ email }: EmailForm) => actions.auth.loginEmail(email)

const onSubmitResult = R.curry(processLoginResponse)

const { getForm, actionCreators } = configureForm("login:email", newEmailForm)

const mapStateToProps = state => {
  const form = getForm(state)
  const processing = state.auth.processing

  return {
    form,
    processing,
    onSubmitResult,
    validateForm
  }
}

const mergeProps = mergeAndInjectProps(
  (stateProps, dispatchProps, { history }) => ({
    onSubmitResult: onSubmitResult(history)
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(LoginPage)
