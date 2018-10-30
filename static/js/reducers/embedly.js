// @flow
import * as api from "../lib/api"
import { GET, INITIAL_STATE } from "redux-hammock/constants"

export type EmbedlyResponse = {
  url: string,
  response: Object
}

export type EmbedlyData = Map<string, Object>

export const embedlyEndpoint = {
  name:              "embedly",
  verbs:             [GET],
  getFunc:           (url: string) => api.getEmbedly(url),
  getSuccessHandler: (
    payload: EmbedlyResponse,
    data: EmbedlyData
  ): EmbedlyData => {
    const update = new Map(data)
    update.set(payload.url, payload.response)
    return update
  },
  initialState: { ...INITIAL_STATE, data: new Map() }
}
