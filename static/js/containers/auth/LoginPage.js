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
import ExternalLogins from "../../components/ExternalLogins"
import CanonicalLink from "../../components/CanonicalLink"

import { actions } from "../../actions"
import { setAuthUserDetail } from "../../actions/ui"
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

import type { Match } from "react-router"
import type {
  AuthResponse,
  EmailDetailAuthResponse,
  EmailForm
} from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type LoginPageProps = {
  match: Match,
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
    const { renderForm, formError, match } = this.props

    return (
      <div className="auth-page login-page">
        <div className="main-content">
          <Card className="login-card">
            <h3>Login</h3>
            <MetaTags>
              <title>{formatTitle("Login")}</title>
              <CanonicalLink match={match} />
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

const onSubmitResult = R.curry(
  (
    setAuthUserDetail: Function,
    history: Object,
    response: AuthResponse | EmailDetailAuthResponse
  ) => {
    // The auth endpoint returns some information about the user in a property called "extra_data".
    // We want to keep that data around for UI purposes, so we dispatch an action here to set it in the state.
    // NOTE:
    // This auth user detail in the state is not explicitly cleared anywhere. When the login flow is
    // finished we force a page reload, so that part of the state is "cleared" as a side effect.
    // We may find situations where we need to clear that state programatically to avoid unintended
    // UI consequences. In that case it would probably be best to wrap all of the auth flow components
    // in a special <Route> that handles the lifecycle of that auth user detail state.
    const authUserDetail = R.propOr({}, "extra_data")(response)
    authUserDetail.email = response.email
    setAuthUserDetail(authUserDetail)
    return processAuthResponse(history, response)
  }
)

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
  (stateProps, { setAuthUserDetail }, { history }) => ({
    onSubmitResult: onSubmitResult(setAuthUserDetail, history)
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      clearEndpointState,
      setAuthUserDetail,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(LoginPage)
