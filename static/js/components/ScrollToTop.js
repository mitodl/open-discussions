// @flow
import React from "react"

import { withRouter } from "react-router"

import type { Location } from "react-router"

type Props = {
  children: React$Element<*>,
  location: Location,
  history: Object
}

class ScrollToTop extends React.Component<Props> {
  componentDidUpdate(prevProps) {
    const { history, location } = this.props
    if (location !== prevProps.location && history.action === "PUSH") {
      window.scrollTo(0, 0)
    }
  }

  render() {
    const { children } = this.props
    return children
  }
}

export default withRouter(ScrollToTop)
