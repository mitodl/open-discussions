// @flow
import { GET, PATCH, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"

import type { WidgetListResponse } from "../flow/widgetTypes"

export const widgetsEndpoint = {
  name:         "widgets",
  verbs:        [GET, PATCH],
  initialState: {
    ...INITIAL_STATE,
    data: {
      id:      null,
      widgets: []
    }
  },
  getFunc: (widgetListId: number): Promise<WidgetListResponse> =>
    api.getWidgetList(widgetListId),
  patchFunc: (widgetListId: number, payload: Object) =>
    api.patchWidgetList(widgetListId, payload)
}
