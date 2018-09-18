// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { Link } from "react-router-dom"

import Card from "../../components/Card"
import ExternalLogins from "../../components/ExternalLogins"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"
import CanonicalLink from "../../components/CanonicalLink"

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
import { LOGIN_URL } from "../../lib/url"
import { validateNewEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"

import type { Match } from "react-router"
import type { EmailForm, AuthResponse } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type RegisterPageProps = {
  match: Match,
  history: Object,
  formError: ?string
} & WithFormProps<EmailForm>

export const RegisterPage = ({
  renderForm,
  formError,
  match
}: RegisterPageProps) => (
  <div className="auth-page register-page">
    <div className="main-content">
      <Card className="register-card">
        <h3>Join MIT OPEN for free</h3>
        <MetaTags>
          <title>{formatTitle("Register")}</title>
          <CanonicalLink match={match} />
        </MetaTags>
        {renderForm({ formError })}
        <ExternalLogins />
        <div className="alternate-auth-link">
          Already have an account? <Link to={LOGIN_URL}>Log in</Link>
        </div>
      </Card>
    </div>
  </div>
)

const newEmailForm = () => ({ email: "" })

export const FORM_KEY = "register:email"
const { getForm, actionCreators } = configureForm(FORM_KEY, newEmailForm)

const onSubmit = (form: EmailForm) =>
  actions.auth.registerEmail(FLOW_REGISTER, form.email, form.recaptcha)

const onSubmitError = formValidate =>
  formValidate({ recaptcha: `Error validating your submission.` })

const mergeProps = mergeAndInjectProps(
  (stateProps, { setBannerMessage, formValidate }, { history }) => ({
    // Used by withForm()
    useRecaptcha:   true,
    onSubmitError:  () => onSubmitError(formValidate),
    onSubmitResult: (response: AuthResponse) => {
      processAuthResponse(history, response)
      if (response.state === STATE_REGISTER_CONFIRM_SENT && response.email) {
        setBannerMessage(
          `We sent an email to <${
            response.email
          }>, please validate your address to continue.`
        )
      }
    }
  })
)

const mapStateToProps = state => {
  const form = getForm(state)
  const formError = getFormErrorSelector(state)

  return {
    form,
    validateForm,
    formError
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
