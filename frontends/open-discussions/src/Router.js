// @flow
import React from "react"
import { Provider } from "react-redux"
import { Route, Router as ReactRouter } from "react-router-dom"
import { Provider as ReduxQueryProvider } from "redux-query-react"
import { ThemeProvider } from "styled-components"
import { combinedTheme } from "ol-util"

import App from "./pages/App"
import withTracker from "./util/withTracker"
import ScrollToTop from "./components/ScrollToTop"

import { getQueries } from "./lib/redux_query"

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
          <ReduxQueryProvider queriesSelector={getQueries}>
            <ReactRouter history={history}>
              <ThemeProvider theme={combinedTheme}>
                <ScrollToTop>{children}</ScrollToTop>
              </ThemeProvider>
            </ReactRouter>
          </ReduxQueryProvider>
        </Provider>
      </div>
    )
  }
}

export const routes = <Route component={withTracker(App)} />
