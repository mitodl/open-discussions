// @flow
import React from "react"
import { Provider } from "react-redux"
import { Route, Router as ReactRouter } from "react-router-dom"

import App from "./containers/App"
import withTracker from "./util/withTracker"
import ScrollToTop from "./components/ScrollToTop"

import type { Store } from "redux"

type Props = {
  store: Store<*, *>,
  history: Object,
  children: React$Element<*>
}

export default class Router extends React.Component<Props> {
  render() {
    const { store, children, history } = this.props

    return (
      <div>
        <Provider store={store}>
          <ReactRouter history={history}>
            <ScrollToTop>{children}</ScrollToTop>
          </ReactRouter>
        </Provider>
      </div>
    )
  }
}

export const routes = <Route component={withTracker(App)} />
