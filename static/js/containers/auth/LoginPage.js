// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { TOUCHSTONE_URL } from "../../lib/url"
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import {
  FLOW_LOGIN,
  getFormErrorSelector,
  isProcessing
} from "../../reducers/auth"

import type { EmailForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type LoginPageProps = {
  history: Object,
  formError: ?string
} & WithFormProps<EmailForm>

export const LoginPage = ({ renderForm, formError }: LoginPageProps) => (
  <div className="content auth-page login-page">
    <div className="main-content">
      <Card className="login-card">
        <h3>Log In</h3>
        <DocumentTitle title={formatTitle("Log In")} />
        {renderForm({ formError })}
        <div className="textline">Or use</div>
        <div className="actions row">
          <a className="link-button" href={TOUCHSTONE_URL}>
            Touchstone
            <span className="ampersand">@</span>
            MIT
          </a>
        </div>
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
