// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import {
  FLOW_LOGIN,
  getFormErrorSelector,
  isProcessing
} from "../../reducers/auth"

import type { EmailForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"
import ExternalLogins from "../../components/ExternalLogins"

type LoginPageProps = {
  history: Object,
  formError: ?string
} & WithFormProps<EmailForm>

export const LoginPage = ({ renderForm, formError }: LoginPageProps) => (
  <div className="content auth-page login-page">
    <div className="main-content">
      <Card className="login-card">
        <h3>Log In</h3>
        <MetaTags>
          <title>{formatTitle("Log In")}</title>
        </MetaTags>
        {renderForm({ formError })}
        <div className="textline">Or use</div>
        <ExternalLogins />
      </Card>
    </div>
  </div>
)

const newEmailForm = () => ({ email: "" })

const onSubmit = ({ email }: EmailForm) =>
  actions.auth.loginEmail(FLOW_LOGIN, email)

const onSubmitResult = R.curry(processAuthResponse)

export const FORM_KEY = "login:email"
const { getForm, actionCreators } = configureForm(FORM_KEY, newEmailForm)

const mapStateToProps = state => {
  const form = getForm(state)
  const processing = isProcessing(state)
  const formError = getFormErrorSelector(state)

  return {
    form,
    processing,
    onSubmitResult,
    validateForm,
    formError
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
