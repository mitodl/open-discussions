// @flow
import { PATCH } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure } from "./fetch_auth"

import type { WidgetListResponse } from "../../flow/widgetTypes"

export const getWidgetList = (
  widgetListId: number
): Promise<WidgetListResponse> =>
  fetchJSONWithAuthFailure(`/api/v0/widget_lists/${widgetListId}/`)

export const patchWidgetList = (
  widgetListId: number,
  payload: Object
): Promise<WidgetListResponse> =>
  fetchJSONWithAuthFailure(`/api/v0/widget_lists/${widgetListId}/`, {
    method: PATCH,
    body:   JSON.stringify(payload)
  })
