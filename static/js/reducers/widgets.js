// @flow
import { GET, PATCH, INITIAL_STATE } from "redux-hammock/constants"

import * as widgetAPI from "../lib/api/widgets"

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
    widgetAPI.getWidgetList(widgetListId),
  patchFunc: (widgetListId: number, payload: Object) =>
    widgetAPI.patchWidgetList(widgetListId, payload)
}
