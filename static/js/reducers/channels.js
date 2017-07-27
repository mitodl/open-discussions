// @flow
import { GET, POST, INITIAL_STATE } from "redux-hammock/constants"

import type { Channel } from "../flow/discussionTypes"
import * as api from "../lib/api"

export const channelsEndpoint = {
  name:              "channels",
  verbs:             [GET, POST],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           (name: string) => api.getChannel(name),
  getSuccessHandler: (payload: Channel, data: Map<string, Channel>) => {
    let update = new Map(data)
    update.set(payload.name, payload)
    return update
  },
  postFunc:           (channel: Channel) => api.createChannel(channel),
  postSuccessHandler: (payload: Channel, data: Map<string, Channel>) => {
    let update = new Map(data)
    update.set(payload.name, payload)
    return update
  }
}
