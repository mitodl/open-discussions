// @flow
import { deriveActions } from "redux-hammock"

import { endpoints } from "../lib/redux_rest"

const actions: Object = {}
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
})

export { actions }
