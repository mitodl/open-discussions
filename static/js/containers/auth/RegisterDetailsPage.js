// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import AuthDetailsForm from "../../components/auth/AuthDetailsForm"
import withForm from "../../hoc/withForm"

import { actions } from "../../actions"
import { processRegisterResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { validateRegisterDetailsForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"

import type { DetailsForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../hoc/withForm"

type RegisterDetailsPageProps = {
  history: Object
} & WithFormProps

const RegisterDetailsPage = ({ renderForm }: RegisterDetailsPageProps) => (
  <div className="content auth-page register-details-page">
    <div className="main-content">
      <Card className="register-card">
        <h3>
          Thanks for confirming!
          <br />
          Last details:
        </h3>
        <DocumentTitle title={formatTitle("Thanks for confirming!")} />
        {renderForm()}
        <hr />
      </Card>
    </div>
  </div>
)

const newDetailsForm = () => ({ name: "", password: "", tos: false })

const onSubmit = R.curry((partialToken: string, form: DetailsForm) =>
  actions.registerDetails.post(partialToken, form.name, form.password, form.tos)
)

const onSubmitResult = R.curry(processRegisterResponse)

const { getForm, actionCreators } = configureForm(
  "register:details",
  newDetailsForm
)

const mapStateToProps = state => {
  const processing = state.registerDetails.processing
  const form = getForm(state)

  return {
    processing,
    form,
    validateForm
  }
}

const mergeProps = mergeAndInjectProps(
  ({ partialToken }, dispatchProps, { history }) => ({
    onSubmitResult: onSubmitResult(history, null),
    onSubmit:       onSubmit(partialToken)
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(AuthDetailsForm)
)(RegisterDetailsPage)
