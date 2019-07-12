/* global require:false, module:false */
import { compose, createStore, applyMiddleware } from "redux"
import thunkMiddleware from "redux-thunk"
import { createLogger } from "redux-logger"
import createDebounce from "redux-debounced"
import { queryMiddlewareAdvanced } from "redux-query"
import persistState from "redux-localstorage"
import R from "ramda"

import rootReducer from "../reducers"
import { makeRequest } from "./network_interface"

export const getQueries = state => state.queries
export const getEntities = state => state.entities

const persistConfig = {
  slicer: () => state => {
    const lens = R.lensPath(["ui", "showDrawerDesktop"])
    return R.set(lens, R.view(lens, state), {})
  },
  merge: R.mergeDeepRight
}

export let createStoreWithMiddleware
if (process.env.NODE_ENV !== "production") {
  createStoreWithMiddleware = compose(
    persistState(null, persistConfig),
    applyMiddleware(
      queryMiddlewareAdvanced(makeRequest)(getQueries, getEntities),
      createDebounce(),
      thunkMiddleware,
      createLogger()
    ),
    window.devToolsExtension ? window.devToolsExtension() : f => f
  )(createStore)
} else {
  createStoreWithMiddleware = compose(
    persistState(null, persistConfig),
    applyMiddleware(
      queryMiddlewareAdvanced(makeRequest)(getQueries, getEntities),
      createDebounce(),
      thunkMiddleware
    )
  )(createStore)
}

export default function configureStore(initialState: Object) {
  const store = createStoreWithMiddleware(
    rootReducer,
    // calling the reducer with `undefined` and a no-op action
    // returns the default state. we need this because the
    // persistState middleware merges the persisted data into this
    // default state, so we need to ensure that `createStore` is passed
    // an initialState value in all cases.
    initialState || rootReducer(undefined, { type: "NOOP" })
  )

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept("../reducers", () => {
      const nextRootReducer = require("../reducers")

      store.replaceReducer(nextRootReducer)
    })
  }

  return store
}
