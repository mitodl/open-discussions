// @flow
import { deriveActions } from "redux-hammock"

import { endpoints } from "../lib/redux_rest"
import * as forms from "./forms"

const actions: Object = { forms }
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
})

export { actions }

export const FETCH_FAILURE = "FETCH_FAILURE"
export const FETCH_SUCCESS = "FETCH_SUCCESS"
export const FETCH_PROCESSING = "FETCH_PROCESSING"
