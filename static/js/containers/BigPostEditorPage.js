// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import withForm from "../hoc/withForm"
import BigPostEditor from "../components/BigPostEditor/Editor"
import withSingleColumn from "../hoc/withSingleColumn"

import { configureForm } from "../lib/forms"

type Props = {}

class BigPostEditorPage extends React.Component<Props> {
  render() {
    return <BigPostEditor onChange={console.log} />
  }
}

export default withSingleColumn("big-post-page")(BigPostEditorPage)

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
