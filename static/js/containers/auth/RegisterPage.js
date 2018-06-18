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
import { validateEmailForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import { FLOW_REGISTER, STATE_REGISTER_CONFIRM_SENT } from "../../reducers/auth"

import type { EmailForm, AuthResponse } from "../../flow/authTypes"
import type { WithFormProps } from "../../hoc/withForm"

type RegisterPageProps = {
  history: Object
} & WithFormProps

const RegisterPage = ({ renderForm }: RegisterPageProps) => (
  <div className="content auth-page register-page">
    <div className="main-content">
      <Card className="register-card">
        <h3>Register</h3>
        <DocumentTitle title={formatTitle("Register")} />
        {renderForm()}
        <hr />
      </Card>
    </div>
  </div>
)

const newEmailForm = () => ({ email: "" })

const { getForm, actionCreators } = configureForm(
  "register:email",
  newEmailForm
)

const onSubmit = (form: EmailForm) =>
  actions.auth.registerEmail(FLOW_REGISTER, form.email)

const mapStateToProps = state => {
  const form = getForm(state)
  const processing = state.auth.processing

  return {
    form,
    processing,
    validateForm
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
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthEmailForm)
)(RegisterPage)
