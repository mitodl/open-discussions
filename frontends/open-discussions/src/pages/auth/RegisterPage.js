// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { Link } from "react-router-dom"
import qs from "query-string"

import { MetaTags, Card } from "ol-util"
import ExternalLogins from "../../components/ExternalLogins"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { setBannerMessage } from "../../actions/ui"
import {
  FLOW_REGISTER,
  STATE_REGISTER_CONFIRM_SENT,
  getFormErrorSelector
} from "../../reducers/auth"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { LOGIN_URL, getNextParam } from "../../lib/url"
import { validateNewEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"

import type { Match } from "react-router"
import type { EmailForm, AuthResponse } from "../../flow/authTypes"
import type { FormErrors, WithFormProps } from "../../flow/formTypes"

type RegisterPageProps = {
  match: Match,
  history: Object,
  formError: ?string,
  next: string
} & WithFormProps<EmailForm>

export const RegisterPage = ({
  renderForm,
  formError,
  match,
  next
}: RegisterPageProps) => (
  <div className="auth-page register-page">
    <div className="main-content">
      <Card className="register-card">
        <h3>Join MIT OPEN for free</h3>
        <MetaTags canonicalLink={match?.url}>
          <title>{formatTitle("Register")}</title>
        </MetaTags>
        {renderForm({ formError, submitLabel: "Sign Up" })}
        <ExternalLogins next={next} />
        <div className="alternate-auth-link">
          Already have an account?{" "}
          <Link to={`${LOGIN_URL}?${qs.stringify({ next })}`}>Log in</Link>
        </div>
      </Card>
    </div>
  </div>
)

const newEmailForm = () => ({ email: "" })

export const FORM_KEY = "register:email"
const { getForm, actionCreators } = configureForm(FORM_KEY, newEmailForm)

const onSubmit = (form: EmailForm, next: string) =>
  actions.auth.registerEmail(FLOW_REGISTER, form.email, next, form.recaptcha)

const onSubmitFailure = (): FormErrors<*> => ({
  recaptcha: `Error validating your submission.`
})

const mergeProps = mergeAndInjectProps(
  (stateProps, { setBannerMessage, onSubmit }, { history, location }) => {
    const next = getNextParam(location.search)
    return {
      // Used by withForm()
      useRecaptcha:   true,
      onSubmit:       form => onSubmit(form, next),
      onSubmitResult: (response: AuthResponse) => {
        processAuthResponse(history, response)
        if (response.state === STATE_REGISTER_CONFIRM_SENT && response.email) {
          setBannerMessage(
            `We sent an email to <${response.email}>, please validate your address to continue.`
          )
        }
      },
      next
    }
  }
)

const mapStateToProps = state => {
  const form = getForm(state)
  const formError = getFormErrorSelector(state)

  return {
    form,
    validateForm,
    formError,
    onSubmitFailure
  }
}

export default R.compose(
  connect(
    mapStateToProps,
    {
      setBannerMessage,
      onSubmit,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(RegisterPage)
