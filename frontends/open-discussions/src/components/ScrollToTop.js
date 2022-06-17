// @flow
import React from "react"

import { withRouter } from "react-router"

import type { ContextRouter } from "react-router"

type Props = {|
  children: React$Node
|}

class ScrollToTop extends React.Component<{ ...Props, ...ContextRouter }> {
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

export default withRouter<Props>(ScrollToTop)
