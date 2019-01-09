// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import type { Channel } from "../flow/discussionTypes"
import * as channelAPI from "../lib/api/channels"

export const subscribedChannelsEndpoint = {
  name:              "subscribedChannels",
  verbs:             [GET],
  initialState:      { ...INITIAL_STATE, data: [] },
  getFunc:           () => channelAPI.getChannels(),
  getSuccessHandler: (payload: Array<Channel>): any =>
    payload.map(channel => channel.name)
}
