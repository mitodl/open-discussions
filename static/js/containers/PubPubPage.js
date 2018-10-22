// @flow
import React from "react"
import Editor from "@pubpub/editor"
import { connect } from "react-redux"
import R from "ramda"

import withForm from "../hoc/withForm"

import { configureForm, getAuthResponseFieldErrors } from "../lib/forms"

type Props = {}

class PubPubPage extends React.Component<Props> {
  render() {
    const { renderForm } = this.props

    return <div className="pubpub">{renderForm()}</div>
  }
}

const FormShim = ({ form, onUpdate }) => (
  <form className="pubpub">
    <Editor />
  </form>
)

const form = (): PasswordForm => ({ password: "" })

export const FORM_KEY = "pubpub"
const { getForm, actionCreators } = configureForm(FORM_KEY, form)

const mapStateToProps = state => {
  const form = getForm(state)

  return { form }
}

export default R.compose(
  connect(mapStateToProps),
  withForm(FormShim)
)(PubPubPage)
