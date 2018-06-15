// @flow
import { deriveActions } from "redux-hammock"

import { endpoints } from "../lib/redux_rest"
import * as forms from "./forms"

const actions: Object = { forms }
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
})

export { actions }
