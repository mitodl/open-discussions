// @flow
/* global SETTINGS: false */

// From https://github.com/ReactTraining/react-router/issues/4278#issuecomment-299692502
import React from "react"
import ReactGA from "react-ga"

const withTracker = (WrappedComponent: Class<React.Component<*, *>>) => {
  const debug = SETTINGS.reactGaDebug === "true"
  // $FlowFixMe: process.browser comes from a polyfill provided by webpack
  const test = !process.browser && process.env.NODE_ENV === "development"

  if (SETTINGS.gaTrackingID) {
    ReactGA.initialize(SETTINGS.gaTrackingID, { debug: debug, testMode: test })
  }

  const HOC = (props: Object) => {
    const page = props.location.pathname
    ReactGA.pageview(page)
    return <WrappedComponent {...props} />
  }

  return HOC
}

export default withTracker
