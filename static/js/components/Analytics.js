// @flow
import React from "react"
import { withRouter } from "react-router"
import ReactGA from 'react-ga'

class Analytics extends React.Component {
  componentDidUpdate(prevProps) {
    const { location } = this.props

    if (location !== prevProps.location) {
      ga.pageview(window.location.pathname)
    }
  }

  render() {
    return null
  }
}

export default withRouter(Analytics)
