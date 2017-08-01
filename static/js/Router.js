import React from "react"
import { Provider } from "react-redux"
import { Route, Router as ReactRouter } from "react-router-dom"

import App from "./containers/App"
import withTracker from "./util/withTracker"

export default class Router extends React.Component {
  props: {
    store: Store,
    history: Object
  }

  render() {
    const { store, children, history } = this.props

    return (
      <div>
        <Provider store={store}>
          <ReactRouter history={history}>
            {children}
          </ReactRouter>
        </Provider>
      </div>
    )
  }
}

export const routes = <Route url="/" component={withTracker(App)} />
