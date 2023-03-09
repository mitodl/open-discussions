// @flow
import React from "react"
import { Provider } from "react-redux"
import { Route, Router as ReactRouter } from "react-router-dom"
import { Provider as ReduxQueryProvider } from "redux-query-react"

import App from "./pages/App"
import withTracker from "./util/withTracker"
import ScrollToTop from "./components/ScrollToTop"

import { getQueries } from "./lib/redux_query"

import type { Store } from "redux"
import { HelmetProvider } from "react-helmet-async"

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
          <ReduxQueryProvider queriesSelector={getQueries}>
            <HelmetProvider>
              <ReactRouter history={history}>
                <ScrollToTop>{children}</ScrollToTop>
              </ReactRouter>
            </HelmetProvider>
          </ReduxQueryProvider>
        </Provider>
      </div>
    )
  }
}

export const routes = <Route component={withTracker(App)} />
