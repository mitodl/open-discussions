// @flow
import React from "react"

import { withRouter } from "react-router"

class ScrollToTop extends React.Component {
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
