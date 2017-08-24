// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import type { Channel } from "../flow/discussionTypes"
import * as api from "../lib/api"

export const subscribedChannelsEndpoint = {
  name:              "subscribedChannels",
  verbs:             [GET],
  initialState:      { ...INITIAL_STATE, data: [] },
  getFunc:           () => api.getChannels(),
  getSuccessHandler: (payload: Array<Channel>) =>
    payload.map(channel => channel.name)
}
