// @flow
import React from "react"
import Editor from "@pubpub/editor/dist"
import { connect } from "react-redux"
import R from "ramda"

import withForm from "../hoc/withForm"

import { configureForm, getAuthResponseFieldErrors } from "../lib/forms"

type Props = {}

export default class PubPubPage extends React.Component<Props> {
  render() {
    const { renderForm } = this.props

    // return <div className="pubpub">{renderForm()}</div>
          // initialContent={{}}

    return (
      <div className="pubpub">
        <Editor
          customNodes={{}}
          customMarks={{}}
          customPlugins={{}}
          nodeOptions={{}}
          collaborativeOptions={{}}
          onChange={changeObject => {}}
          placeholder="blaaaahhh"
          isReadOnly={false}
          highlights={[]}
          getHighlightContent={(from, to) => {}}
        />
      </div>
    )
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

// export default R.compose(
//   connect(mapStateToProps, actionCreators),
//   withForm(FormShim)
// )(PubPubPage)
