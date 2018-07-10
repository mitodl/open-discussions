// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import AuthEmailForm from "../../components/auth/AuthEmailForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { setSnackbarMessage } from "../../actions/ui"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { TOUCHSTONE_URL } from "../../lib/url"
import { preventDefaultAndInvoke } from "../../lib/util"
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import {
  FLOW_REGISTER,
  STATE_REGISTER_CONFIRM_SENT,
  getAuthEmailSelector,
  getAuthPartialTokenSelector,
  isProcessing,
  getFormErrorSelector
} from "../../reducers/auth"

import type { EmailForm, AuthResponse } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type RegisterPageProps = {
  history: Object,
  email: ?string,
  partialToken: ?string,
  onSubmitContinue: Function,
  formError: ?string
} & WithFormProps<EmailForm>

export const RegisterPage = ({
  renderForm,
  partialToken,
  email,
  onSubmitResult,
  onSubmitContinue,
  processing,
  formError
}: RegisterPageProps) => (
  <div className="content auth-page register-page">
    <div className="main-content">
      <Card className="register-card">
        <h3>
          {partialToken && email
            ? `We could not find an account with the email: ${email}`
            : "Sign up for free to unlock more features."}
        </h3>
        <DocumentTitle title={formatTitle("Register")} />
        {partialToken && email ? (
          <form
            onSubmit={preventDefaultAndInvoke(() =>
              onSubmitContinue(email, partialToken).then(onSubmitResult)
            )}
            className="form"
          >
            <div className="actions row">
              <button type="submit" disabled={processing}>
                Make an account with the email above
              </button>
            </div>
          </form>
        ) : (
          renderForm({ formError })
        )}
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

export const FORM_KEY = "register:email"
const { getForm, actionCreators } = configureForm(FORM_KEY, newEmailForm)

const onSubmit = (form: EmailForm) =>
  actions.auth.registerEmail(FLOW_REGISTER, form.email)

const onSubmitContinue = (email: string, partialToken: string) =>
  actions.auth.registerEmail(FLOW_REGISTER, email, partialToken)

const mapStateToProps = state => {
  const form = getForm(state)
  const processing = isProcessing(state)
  const email = getAuthEmailSelector(state)
  const partialToken = getAuthPartialTokenSelector(state)
  const formError = getFormErrorSelector(state)

  return {
    form,
    processing,
    validateForm,
    email,
    partialToken,
    formError
  }
}

const mergeProps = mergeAndInjectProps(
  (stateProps, { setSnackbarMessage }, { history }) => ({
    onSubmitResult: (response: AuthResponse) => {
      processAuthResponse(history, response)
      if (response.state === STATE_REGISTER_CONFIRM_SENT && response.email) {
        setSnackbarMessage({
          message: `We sent an email to <${
            response.email
          }>, please validate to continue`
        })
      }
    }
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      setSnackbarMessage,
      onSubmit,
      onSubmitContinue,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(RegisterPage)
