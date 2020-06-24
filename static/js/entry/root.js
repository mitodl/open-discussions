// @flow
require("react-hot-loader/patch")
/* global SETTINGS:false */
__webpack_public_path__ = SETTINGS.public_path // eslint-disable-line no-undef, camelcase
import React from "react"
import ReactDOM from "react-dom"
import { AppContainer, setConfig } from "react-hot-loader"
import { createBrowserHistory } from "history"

import configureStore from "../store/configureStore"
import Router, { routes } from "../Router"

import { enableMapSet } from "immer"
enableMapSet()

import * as Sentry from "@sentry/browser"

Sentry.init({
  dsn:         SETTINGS.sentry_dsn,
  release:     SETTINGS.release_version,
  environment: SETTINGS.environment
})

// requirement for creating blob from crop canvas.
import "blueimp-canvas-to-blob/js/canvas-to-blob.js"

setConfig({ pureSFC: true })

// Object.entries polyfill
import entries from "object.entries"
if (!Object.entries) {
  entries.shim()
}

const store = configureStore()

const rootEl = document.getElementById("container")
if (!rootEl) {
  throw new Error("container div doesn't exist")
}

const history = createBrowserHistory()
const renderApp = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component store={store} history={history}>
        {routes}
      </Component>
    </AppContainer>,
    rootEl
  )
}

renderApp(Router)

if (module.hot) {
  module.hot.accept("../Router", () => {
    const RouterNext = require("../Router").default
    renderApp(RouterNext)
  })
}
