// @flow
/* global SETTINGS: false */

// From https://github.com/ReactTraining/react-router/issues/4278#issuecomment-299692502
import React from "react"
import ReactGA from "react-ga"

const withTracker = (WrappedComponent: Class<React.Component<*, *>>) => {
  const debug = SETTINGS.reactGaDebug === "true"
  // $FlowFixMe: process.browser comes from a polyfill provided by webpack
  const test = !process.browser && process.env.NODE_ENV !== "production"

  if (SETTINGS.gaTrackingID) {
    ReactGA.initialize(SETTINGS.gaTrackingID, { debug: debug, testMode: test })
  }

  if (SETTINGS.gaGTrackingID) {
    const url = `https://www.googletagmanager.com/gtag/js?id=${SETTINGS.gaGTrackingID}`
    const gaScript = document.createElement("script")
    gaScript.src = url
    gaScript.async = true
    // $FlowFixMe: document.head is not null
    document.head.appendChild(gaScript)

    const gaScript2 = document.createElement("script")
    gaScript2.innerHTML = `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${SETTINGS.gaGTrackingID}');`

    // $FlowFixMe: document.head is not null
    document.head.appendChild(gaScript2)
  }

  const HOC = (props: Object) => {
    const page = props.location.pathname

    ReactGA.pageview(page)

    return <WrappedComponent {...props} />
  }

  return HOC
}

export default withTracker
