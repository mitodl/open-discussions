// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { Link } from "react-router-dom"

import Card from "../../components/Card"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { REGISTER_URL } from "../../lib/url"
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
  formError: ?string,
  clearEndpointState: Function
} & WithFormProps<EmailForm>

export class LoginPage extends React.Component<LoginPageProps> {
  componentWillUnmount() {
    const { formError, clearEndpointState } = this.props
    if (formError) {
      clearEndpointState()
    }
  }

  render() {
    const { renderForm, formError } = this.props

    return (
      <div className="content auth-page login-page">
        <div className="main-content">
          <Card className="login-card">
            <h3>Login</h3>
            <MetaTags>
              <title>{formatTitle("Login")}</title>
            </MetaTags>
            {renderForm({ formError })}
            <ExternalLogins />
            <div className="alternate-auth-link">
              Not a member? <Link to={REGISTER_URL}>Sign up</Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

const newEmailForm = () => ({ email: "" })

const onSubmit = ({ email }: EmailForm) =>
  actions.auth.loginEmail(FLOW_LOGIN, email)

const clearEndpointState = actions.auth.clear

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
      clearEndpointState,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(LoginPage)
