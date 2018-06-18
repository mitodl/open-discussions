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
  getPartialTokenSelector,
  getAuthFlowSelector,
  FLOW_LOGIN
} from "../../reducers/auth"

import type { PasswordForm, AuthFlow } from "../../flow/authTypes"
import type { WithFormProps } from "../../hoc/withForm"

type LoginPasswordPageProps = {
  history: Object,
  partialToken: string,
  authFlow: AuthFlow,
  isLoginFlow: boolean
} & WithFormProps

const LoginPasswordPage = ({
  renderForm,
  isLoginFlow
}: LoginPasswordPageProps) => (
  <div className="content auth-page login-password-page">
    <div className="main-content">
      <Card className="login-card">
        <h3>
          {isLoginFlow
            ? "Welcome Back!"
            : "There is already an account with this email"}
        </h3>
        <DocumentTitle title={formatTitle("Log In")} />
        {renderForm()}
      </Card>
    </div>
  </div>
)

const newPasswordForm = () => ({ password: "" })

const { getForm, actionCreators } = configureForm(
  "login:password",
  newPasswordForm
)

const onSubmit = (
  authFlow: AuthFlow,
  partialToken: string,
  form: PasswordForm
) => actions.auth.loginPassword(authFlow, partialToken, form.password)

const onSubmitResult = R.curry(processAuthResponse)

const formBeginEditIfPartial = (
  formBeginEdit: Function,
  history: Object,
  partialToken: ?string
) => () => {
  if (partialToken) {
    formBeginEdit()
  } else {
    history.push(LOGIN_URL)
  }
}

const mergeProps = mergeAndInjectProps(
  ({ partialToken, authFlow }, { formBeginEdit, onSubmit }, { history }) => ({
    formBeginEdit:  formBeginEditIfPartial(formBeginEdit, history, partialToken),
    onSubmit:       (form: PasswordForm) => onSubmit(authFlow, partialToken, form),
    onSubmitResult: onSubmitResult(history)
  })
)

const mapStateToProps = state => {
  const form = getForm(state)
  const partialToken = getPartialTokenSelector(state)
  const processing = state.auth.processing
  const authFlow = getAuthFlowSelector(state)
  const isLoginFlow = authFlow === FLOW_LOGIN

  return {
    form,
    partialToken,
    processing,
    onSubmitResult,
    validateForm,
    authFlow,
    isLoginFlow
  }
}

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthPasswordForm)
)(LoginPasswordPage)
