// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import AuthPasswordForm from "../../components/auth/AuthPasswordForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { LOGIN_URL } from "../../lib/url"
import { validatePasswordForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import {
  getAuthPartialTokenSelector,
  getAuthFlowSelector,
  isLoginFlow,
  isProcessing,
  getFormErrorSelector
} from "../../reducers/auth"

import type { PasswordForm, AuthFlow } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type LoginPasswordPageProps = {
  history: Object,
  partialToken: string,
  authFlow: AuthFlow,
  isLoginFlow: boolean,
  formError: ?string
} & WithFormProps<PasswordForm>

export class LoginPasswordPage extends React.Component<*, *> {
  props: LoginPasswordPageProps

  componentDidMount() {
    const { history, partialToken } = this.props
    if (!partialToken) {
      history.push(LOGIN_URL)
    }
  }

  render() {
    const { renderForm, isLoginFlow, formError } = this.props
    return (
      <div className="content auth-page login-password-page">
        <div className="main-content">
          <Card className="login-card">
            <h3>
              {isLoginFlow
                ? "Welcome Back!"
                : "There is already an account with this email"}
            </h3>
            <DocumentTitle title={formatTitle("Log In")} />
            {renderForm({ formError })}
          </Card>
        </div>
      </div>
    )
  }
}

const newPasswordForm = (): PasswordForm => ({ password: "" })

export const FORM_KEY = "login:password"
const { getForm, actionCreators } = configureForm(FORM_KEY, newPasswordForm)

const onSubmit = (
  authFlow: AuthFlow,
  partialToken: string,
  form: PasswordForm
) => actions.auth.loginPassword(authFlow, partialToken, form.password)

const onSubmitResult = R.curry(processAuthResponse)

export const mergeProps = mergeAndInjectProps(
  ({ partialToken, authFlow }, { onSubmit }, { history }) => ({
    onSubmit:       form => onSubmit(authFlow, partialToken, form),
    onSubmitResult: onSubmitResult(history)
  })
)

const mapStateToProps = state => {
  const form = getForm(state)
  const processing = isProcessing(state)
  const authFlow = getAuthFlowSelector(state)
  const partialToken = getAuthPartialTokenSelector(state)
  const formError = getFormErrorSelector(state)
  return {
    form,
    partialToken,
    authFlow,
    processing,
    onSubmitResult,
    validateForm,
    formError,
    isLoginFlow: isLoginFlow(state)
  }
}

const mapDispatchToProps = {
  onSubmit,
  ...actionCreators
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withForm(AuthPasswordForm)
)(LoginPasswordPage)
