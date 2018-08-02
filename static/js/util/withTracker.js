// @flow
/* global SETTINGS: false */

// From https://github.com/ReactTraining/react-router/issues/4278#issuecomment-299692502
import React from "react"
import ReactGA from "react-ga"
import _ from "lodash"

import { getChannelNameFromPathname } from "../lib/url"

const withTracker = (WrappedComponent: Class<React.Component<*, *>>) => {
  const debug = SETTINGS.reactGaDebug === "true"
  // $FlowFixMe: process.browser comes from a polyfill provided by webpack
  const test = !process.browser && process.env.NODE_ENV === "development"
  const trackers = []

  if (SETTINGS.gaTrackingID) {
    trackers.push({
      trackingId: SETTINGS.gaTrackingID
    })
  }
  if (SETTINGS.gaChannelTrackers) {
    _.forEach(SETTINGS.gaChannelTrackers, function(
      trackingId: string,
      channel: string
    ) {
      trackers.push({
        trackingId,
        gaOptions: { name: channel }
      })
    })
  }

  if (trackers.length > 0) {
    ReactGA.initialize(trackers, { debug: debug, testMode: test })
  }

  const HOC = (props: Object) => {
    const page = props.location.pathname
    const channel = getChannelNameFromPathname(page)
    ReactGA.pageview(page)
    if (channel && SETTINGS.gaChannelTrackers[channel]) {
      ReactGA.ga(`${channel}.send`, "pageview", page)
    }
    return <WrappedComponent {...props} />
  }

  return HOC
}

export default withTracker
