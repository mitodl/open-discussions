// @flow
import { deriveActions } from "redux-hammock"

import { endpoints } from "../lib/redux_rest"
import * as channel from "./channel"
import * as forms from "./forms"
import * as ui from "./ui"

const actions: Object = { forms, ui, channel }
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
})

export { actions }
