// @flow
import React from "react"
import { withRouter } from "react-router"
import ReactGA from 'react-ga'

if (SETTINGS.gaTrackingID) {
  console.log(SETTINGS.gaTrackingID);
  ReactGA.initialize(SETTINGS.gaTrackingID, { debug: true })
  console.log('initializing');
}

class Analytics extends React.Component {
  componentDidUpdate(prevProps) {
    const { location } = this.props

    console.log('potato');

    if (location !== prevProps.location) {
      console.log(window.location.pathname);
      ReactGA.pageview(window.location.pathname)
    }
  }

  render() {
    return null
  }
}

export default withRouter(Analytics)
