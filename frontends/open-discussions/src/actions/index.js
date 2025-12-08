// @flow
import { deriveActions } from "redux-hammock"

import { endpoints } from "../lib/redux_rest"
import * as forms from "./forms"
import * as ui from "./ui"

const actions: Object = { forms, ui }
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
})

export { actions }
