// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import Card from "../../components/Card"
import MetaTags from "../../components/MetaTags"
import AuthPasswordForm from "../../components/auth/AuthPasswordForm"
import LoginGreeting from "../../components/auth/LoginGreeting"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processAuthResponse, goToFirstLoginStep } from "../../lib/auth"
import { configureForm, getAuthResponseFieldErrors } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { LOGIN_URL } from "../../lib/url"
import { preventDefaultAndInvoke } from "../../lib/util"
import { validatePasswordForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import {
  getAuthPartialTokenSelector,
  getAuthFlowSelector,
  isProcessing
} from "../../reducers/auth"
import {
  getAuthUiNameSelector,
  getAuthUiEmailSelector,
  getAuthUiImgSelector
} from "../../reducers/ui"

import type { Match } from "react-router"
import type { PasswordForm, AuthFlow } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type Props = {
  match: Match,
  history: Object,
  partialToken: string,
  authFlow: AuthFlow,
  email: string,
  name: ?string,
  profileImageUrl: ?string
} & WithFormProps<PasswordForm>

export class LoginPasswordPage extends React.Component<Props> {
  componentDidMount() {
    const { history, partialToken } = this.props
    if (!partialToken) {
      history.push(LOGIN_URL)
    }
  }

  render() {
    const { renderForm, email, name, profileImageUrl, history, match } =
      this.props

    const onBackButtonClick = preventDefaultAndInvoke(
      R.partial(goToFirstLoginStep, [history])
    )

    return (
      <div className="auth-page login-password-page">
        <div className="main-content">
          <Card className="login-card">
            <MetaTags canonicalLink={match?.url}>
              <title>{formatTitle("Welcome Back!")}</title>
            </MetaTags>

            <div className="form-header">
              <div className="row">
                <LoginGreeting
                  email={email}
                  name={name}
                  profileImageUrl={profileImageUrl}
                  onBackButtonClick={onBackButtonClick}
                />
              </div>
            </div>
            {renderForm()}
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

const getSubmitResultErrors = getAuthResponseFieldErrors("password")

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
  const name = getAuthUiNameSelector(state)
  const email = getAuthUiEmailSelector(state)
  const profileImageUrl = getAuthUiImgSelector(state)
  return {
    form,
    partialToken,
    authFlow,
    processing,
    onSubmitResult,
    getSubmitResultErrors,
    validateForm,
    email,
    name,
    profileImageUrl
  }
}

const mapDispatchToProps = {
  onSubmit,
  ...actionCreators
}

export default R.compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withForm(AuthPasswordForm)
)(LoginPasswordPage)
