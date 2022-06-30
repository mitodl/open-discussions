// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import AuthDetailsForm from "../../components/auth/AuthDetailsForm"
import withForm from "../../hoc/withForm"
import { CanonicalLink } from "ol-util"

import { actions } from "../../actions"
import { processAuthResponse } from "../../lib/auth"
import { configureForm } from "../../lib/forms"
import { formatTitle } from "../../lib/title"
import { validateRegisterDetailsForm as validateForm } from "../../lib/validation"
import { mergeAndInjectProps } from "../../lib/redux_props"
import {
  getAuthPartialTokenSelector,
  isProcessing,
  getFormErrorSelector,
  FLOW_REGISTER
} from "../../reducers/auth"

import type { Match } from "react-router"
import type { DetailsForm } from "../../flow/authTypes"
import type { WithFormProps } from "../../flow/formTypes"

type RegisterDetailsPageProps = {
  match: Match,
  history: Object,
  partialToken: string,
  formError: ?string
} & WithFormProps<DetailsForm>

export const RegisterDetailsPage = ({
  renderForm,
  formError,
  match
}: RegisterDetailsPageProps) => (
  <div className="auth-page register-details-page">
    <div className="main-content">
      <Card className="register-card">
        <h3>Thanks for confirming!</h3>
        <h4>Last details:</h4>
        <MetaTags>
          <title>{formatTitle("Thanks for confirming!")}</title>
          <CanonicalLink match={match} />
        </MetaTags>
        {renderForm({ formError })}
      </Card>
    </div>
  </div>
)

const newDetailsForm = (): DetailsForm => ({ name: "", password: "" })

const onSubmit = (partialToken: string, form: DetailsForm) =>
  actions.auth.registerDetails(
    FLOW_REGISTER,
    partialToken,
    form.name,
    form.password
  )

const onSubmitResult = R.curry(processAuthResponse)

export const FORM_KEY = "register:details"
const { getForm, actionCreators } = configureForm(FORM_KEY, newDetailsForm)

const mapStateToProps = state => {
  const form = getForm(state)
  const partialToken = getAuthPartialTokenSelector(state)
  const formError = getFormErrorSelector(state)
  return {
    form,
    partialToken,
    validateForm,
    isProcessing,
    formError
  }
}

const mergeProps = mergeAndInjectProps(
  ({ partialToken }, { onSubmit }, { history }) => ({
    onSubmitResult: onSubmitResult(history),
    onSubmit:       form => onSubmit(partialToken, form)
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
