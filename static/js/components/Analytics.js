/* global SETTINGS:false */
// @flow
import React from "react"
import { withRouter } from "react-router"
import ReactGA from "react-ga"

const debug = SETTINGS.reactGaDebug === "true"
if (SETTINGS.gaTrackingID) {
  ReactGA.initialize(SETTINGS.gaTrackingID, { debug: debug })
}

class Analytics extends React.Component {
  componentDidUpdate(prevProps) {
    const { location } = this.props

    if (location !== prevProps.location) {
      ReactGA.pageview(window.location.pathname)
    }
  }

  render() {
    return null
  }
}

export default withRouter(Analytics)
