// @flow
import { combineReducers } from "redux"
import { deriveReducers } from "redux-hammock"
import { entitiesReducer, queriesReducer } from "redux-query"

import { actions } from "../actions"
import { endpoints } from "../lib/redux_rest"
import * as formReducers from "./forms"
import { audio } from "./audio"
import { ui } from "./ui"
import { focus } from "./focus"

const reducers: Object = {}
endpoints.forEach(endpoint => {
  reducers[endpoint.name] = deriveReducers(endpoint, actions[endpoint.name])
})

export default combineReducers<Object, Object>({
  ...reducers,
  ...formReducers,
  audio,
  ui,
  focus,
  entities: entitiesReducer,
  queries:  queriesReducer
})
