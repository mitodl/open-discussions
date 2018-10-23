// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import withForm from "../hoc/withForm"
import BigPostEditor from "../components/BigPostEditor/Editor"

import { configureForm } from "../lib/forms"

type Props = {}

export default class BigPostEditorPage extends React.Component<Props> {
  render() {
    return (
      <div className="pubpub">
        <BigPostEditor onChange={console.log} />
      </div>
    )
  }
}

const form = () => ({ data: {} })

export const FORM_KEY = "bigpost:new"
const { getForm, actionCreators } = configureForm(FORM_KEY, form)

const mapStateToProps = state => {
  const form = getForm(state)

  return { form }
}

// export default R.compose(
//   connect(mapStateToProps, actionCreators),
//   withForm(FormShim)
// )(PubPubPage)
