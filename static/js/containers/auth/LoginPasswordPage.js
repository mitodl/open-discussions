// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"

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
  isProcessing,
  getFormErrorSelector
} from "../../reducers/auth"
import {
  getAuthUiNameSelector,
  getAuthUiEmailSelector,
  getAuthUiImgSelector
} from "../../reducers/ui"

import type { PasswordForm, AuthFlow } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type Props = {
  history: Object,
  partialToken: string,
  authFlow: AuthFlow,
  formError: ?string,
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
    const { renderForm, formError, email, name, profileImageUrl } = this.props
    return (
      <div className="content auth-page login-password-page">
        <div className="main-content">
          <Card className="login-card">
            <h3>{name && profileImageUrl ? `Hi ${name}` : "Welcome Back!"}</h3>
            <MetaTags>
              <title>{formatTitle("Log In")}</title>
            </MetaTags>
            {name && profileImageUrl ? (
              <div className="form-header">
                <div className="row profile-image-email">
                  <img
                    src={profileImageUrl}
                    alt={`Profile image for ${name}`}
                    className="profile-image small"
                  />
                  <span>{email}</span>
                </div>
              </div>
            ) : null}
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
  const name = getAuthUiNameSelector(state)
  const email = getAuthUiEmailSelector(state)
  const profileImageUrl = getAuthUiImgSelector(state)
  return {
    form,
    partialToken,
    authFlow,
    processing,
    onSubmitResult,
    validateForm,
    formError,
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
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withForm(AuthPasswordForm)
)(LoginPasswordPage)
