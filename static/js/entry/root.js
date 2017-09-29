// @flow
require("react-hot-loader/patch")
/* global SETTINGS:false */
__webpack_public_path__ = SETTINGS.public_path // eslint-disable-line no-undef, camelcase
import React from "react"
import ReactDOM from "react-dom"
import { AppContainer } from "react-hot-loader"
import { createBrowserHistory } from "history"

import configureStore from "../store/configureStore"
import Router, { routes } from "../Router"

// Object.entries polyfill
import entries from "object.entries"
if (!Object.entries) {
  entries.shim()
}

const store = configureStore()

const rootEl = document.getElementById("container")

const authRequiredEndpoint = "/auth_required/"
if (
  !SETTINGS.session_url &&
  window.location.pathname !== authRequiredEndpoint
) {
  // user does not have the jwt cookie, they must go through login workflow first
  window.location = authRequiredEndpoint
} else {
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
}
