// @flow
import React from "react"

import { anyProcessing, anyError, allLoaded } from "../util/rest"

import type { RestState } from "../flow/restTypes"

export default class Loading extends React.Component {
  props: {
    restStates: Array<RestState<*>>,
    renderContents: Function
  }

  render() {
    const { restStates, renderContents } = this.props

    if (anyProcessing(restStates) || !allLoaded(restStates)) {
      return <div>Loading</div>
    }

    if (anyError(restStates)) {
      return <div>Error loading page</div>
    }

    return renderContents()
  }
}
