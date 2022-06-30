// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { Link } from "react-router-dom"
import qs from "query-string"

import Card from "../../components/Card"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"
import ExternalLogins from "../../components/ExternalLogins"
import { CanonicalLink } from "ol-util"

import { actions } from "../../actions"
import { setAuthUserDetail } from "../../actions/ui"
import { processAuthResponse } from "../../lib/auth"
import { configureForm, getAuthResponseFieldErrors } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { REGISTER_URL, getNextParam } from "../../lib/url"
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import { FLOW_LOGIN, isProcessing } from "../../reducers/auth"

import type { Location, Match } from "react-router"
import type { AuthResponse, EmailForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type LoginPageProps = {
  location: Location,
  match: Match,
  history: Object,
  next: string
} & WithFormProps<EmailForm>

export class LoginPage extends React.Component<LoginPageProps> {
  render() {
    const { renderForm, match, next } = this.props

    return (
      <div className="auth-page login-page">
        <div className="main-content">
          <Card className="login-card">
            <h3>Login</h3>
            <MetaTags>
              <title>{formatTitle("Login")}</title>
              <CanonicalLink match={match} />
            </MetaTags>
            {renderForm()}
            <ExternalLogins next={next} />
            <div className="alternate-auth-link">
              Not a member?{" "}
              <Link to={`${REGISTER_URL}?${qs.stringify({ next })}`}>
                Sign up
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

const newEmailForm = () => ({ email: "" })

const onSubmit = ({ email }: EmailForm, next: string) =>
  actions.auth.loginEmail(FLOW_LOGIN, email, next)

const getSubmitResultErrors = getAuthResponseFieldErrors("email")

const onSubmitResult = R.curry(
  (setAuthUserDetail: Function, history: Object, response: AuthResponse) => {
    // The auth endpoint returns some information about the user in a property called "extra_data".
    // We want to keep that data around for UI purposes, so we dispatch an action here to set it in the state.
    // NOTE:
    // This auth user detail in the state is not explicitly cleared anywhere. When the login flow is
    // finished we force a page reload, so that part of the state is "cleared" as a side effect.
    // We may find situations where we need to clear that state programatically to avoid unintended
    // UI consequences. In that case it would probably be best to wrap all of the auth flow components
    // in a special <Route> that handles the lifecycle of that auth user detail state.
    const authUserDetail = response.extra_data
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

  return {
    form,
    processing,
    onSubmitResult,
    validateForm,
    getSubmitResultErrors
  }
}

const mergeProps = mergeAndInjectProps(
  (stateProps, { setAuthUserDetail, onSubmit }, { history, location }) => {
    const next = getNextParam(location.search)
    return {
      onSubmitResult: onSubmitResult(setAuthUserDetail, history),
      onSubmit:       form => onSubmit(form, next),
      next
    }
  }
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      setAuthUserDetail,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(LoginPage)
